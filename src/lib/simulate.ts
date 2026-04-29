import type { Transaction } from '../types';
import { creditKey, type Card, type RewardRule, type CapPeriod, type CardCredit } from './cards';

export interface CategoryBreakdown {
  category: string;
  spend: number;
  reward: number;
  effectiveRate: number;
}

export interface SimulationResult {
  cardId: string;
  cardName: string;
  issuer: string;
  grossRewards: number;
  creditsApplied: number;
  credits: CardCredit[];
  feeCharged: number;
  netRewards: number;
  monthsCovered: number;
  totalSpend: number;
  byCategory: CategoryBreakdown[];
}

function periodKey(date: Date, period: CapPeriod): string {
  const y = date.getFullYear();
  if (period === 'year') return String(y);
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

function ruleMatches(rule: RewardRule, category: string): boolean {
  return rule.categories.includes('*') || rule.categories.includes(category);
}

function annualizedCreditValue(credit: CardCredit): number {
  return credit.period === 'four_years' ? credit.amount / 4 : credit.amount;
}

function activeCredits(card: Card, enabledCreditKeys?: ReadonlySet<string>): CardCredit[] {
  const credits = card.credits ?? [];
  if (!enabledCreditKeys) return credits;
  return credits.filter((credit) => enabledCreditKeys.has(creditKey(card.id, credit)));
}

function estimateCredits(credits: CardCredit[], months: number): number {
  const annualValue = credits.reduce((sum, credit) => sum + annualizedCreditValue(credit), 0);
  return annualValue * (months / 12);
}

function monthsCovered(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;
  let min = transactions[0].date.getTime();
  let max = transactions[0].date.getTime();
  for (const t of transactions) {
    const ts = t.date.getTime();
    if (ts < min) min = ts;
    if (ts > max) max = ts;
  }

  // Use elapsed time instead of distinct calendar labels. Jan-to-Jan touches 13
  // month names, but it should still be treated as roughly one card year.
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysCovered = Math.max(1, Math.ceil((max - min) / msPerDay) + 1);
  return Math.max(1, Math.ceil(daysCovered / 31));
}

export function simulate(transactions: Transaction[], card: Card, enabledCreditKeys?: ReadonlySet<string>): SimulationResult {
  const expenses = transactions.filter((t) => t.amount > 0);
  const pointMult = card.pointValue ?? 1;

  // Track per-rule cap consumption keyed by period (e.g. "2024-Q1" or "2024")
  const capUsage = new Map<number, Map<string, number>>();
  const categorySpend = new Map<string, number>();
  const categoryReward = new Map<string, number>();

  let gross = 0;
  let totalSpend = 0;

  // Chronological order so cap accumulation is correct
  const sorted = [...expenses].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const t of sorted) {
    let remaining = t.amount;
    let reward = 0;

    // Highest-rate matching rule wins; if it fills its cap, fall through to next
    const candidates = card.rules
      .map((rule, idx) => ({ rule, idx }))
      .filter(({ rule }) => ruleMatches(rule, t.category))
      .sort((a, b) => b.rule.rate - a.rule.rate);

    for (const { rule, idx } of candidates) {
      if (remaining <= 0) break;

      let usable = remaining;
      if (rule.cap) {
        const key = periodKey(t.date, rule.cap.period);
        const usageMap = capUsage.get(idx) ?? new Map<string, number>();
        const used = usageMap.get(key) ?? 0;
        usable = Math.min(usable, Math.max(rule.cap.amount - used, 0));
        if (usable > 0) {
          usageMap.set(key, used + usable);
          capUsage.set(idx, usageMap);
        }
      }

      if (usable > 0) {
        reward += usable * rule.rate * pointMult;
        remaining -= usable;
      }
    }

    // Anything left over earns the catch-all base rate
    if (remaining > 0) {
      reward += remaining * card.baseRate * pointMult;
    }

    gross += reward;
    totalSpend += t.amount;
    categorySpend.set(t.category, (categorySpend.get(t.category) ?? 0) + t.amount);
    categoryReward.set(t.category, (categoryReward.get(t.category) ?? 0) + reward);
  }

  const months = monthsCovered(expenses);
  const fee = card.annualFee * (months / 12);
  const includedCredits = activeCredits(card, enabledCreditKeys);
  const credits = estimateCredits(includedCredits, months);

  const byCategory: CategoryBreakdown[] = Array.from(categorySpend.entries())
    .map(([category, spend]) => {
      const r = categoryReward.get(category) ?? 0;
      return {
        category,
        spend: round2(spend),
        reward: round2(r),
        effectiveRate: spend > 0 ? round4(r / spend) : 0,
      };
    })
    .sort((a, b) => b.reward - a.reward);

  return {
    cardId: card.id,
    cardName: card.name,
    issuer: card.issuer,
    grossRewards: round2(gross),
    creditsApplied: round2(credits),
    credits: includedCredits,
    feeCharged: round2(fee),
    netRewards: round2(gross + credits - fee),
    monthsCovered: months,
    totalSpend: round2(totalSpend),
    byCategory,
  };
}

export function simulateAll(
  transactions: Transaction[],
  cards: Card[],
  enabledCreditKeys?: ReadonlySet<string>,
): SimulationResult[] {
  return cards
    .map((card) => simulate(transactions, card, enabledCreditKeys))
    .sort((a, b) => b.netRewards - a.netRewards);
}

export interface PortfolioResult {
  grossRewards: number;
  creditsApplied: number;
  feeCharged: number;
  netRewards: number;
  totalSpend: number;
  byCard: { card: Card; result: SimulationResult }[];
  unmappedSpend: number;
  unmappedCount: number;
}

// Simulate the user's actual portfolio: each transaction earns rewards on the
// card its CSV source is mapped to. Transactions whose source isn't mapped to
// a known card are bucketed as "unmapped" and don't count toward rewards.
export function simulatePortfolio(
  transactions: Transaction[],
  cardBySource: Record<string, string>,
  allCards: Card[],
  enabledCreditKeys?: ReadonlySet<string>,
): PortfolioResult {
  const cardById = new Map(allCards.map((c) => [c.id, c]));
  const grouped = new Map<string, Transaction[]>();
  let unmappedSpend = 0;
  let unmappedCount = 0;

  for (const t of transactions) {
    if (t.amount <= 0) continue;
    const cardId = cardBySource[t.source];
    if (!cardId || !cardById.has(cardId)) {
      unmappedSpend += t.amount;
      unmappedCount += 1;
      continue;
    }
    if (!grouped.has(cardId)) grouped.set(cardId, []);
    grouped.get(cardId)!.push(t);
  }

  const byCard: PortfolioResult['byCard'] = [];
  let gross = 0;
  let credits = 0;
  let fee = 0;
  let mappedSpend = 0;

  grouped.forEach((txns, cardId) => {
    const card = cardById.get(cardId)!;
    const result = simulate(txns, card, enabledCreditKeys);
    byCard.push({ card, result });
    gross += result.grossRewards;
    credits += result.creditsApplied;
    fee += result.feeCharged;
    mappedSpend += result.totalSpend;
  });

  byCard.sort((a, b) => b.result.netRewards - a.result.netRewards);

  return {
    grossRewards: round2(gross),
    creditsApplied: round2(credits),
    feeCharged: round2(fee),
    netRewards: round2(gross + credits - fee),
    totalSpend: round2(mappedSpend + unmappedSpend),
    byCard,
    unmappedSpend: round2(unmappedSpend),
    unmappedCount,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
