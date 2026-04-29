import { useState } from 'react';
import type { Transaction } from '../types';
import { CARDS, creditKey } from '../lib/cards';
import type { CardCredit } from '../lib/cards';
import { simulateAll, simulatePortfolio } from '../lib/simulate';

interface Props {
  transactions: Transaction[];
  sources: string[];
  cardBySource: Record<string, string>;
  onAssignCard: (source: string, cardId: string) => void;
}

const ISSUER_BRANDS: Record<string, { label: string; short: string; gradient: string; accent: string }> = {
  Chase: {
    label: 'Chase',
    short: 'CHASE',
    gradient: 'linear-gradient(135deg, #0b4ea2 0%, #1d4ed8 100%)',
    accent: '#60a5fa',
  },
  Amex: {
    label: 'American Express',
    short: 'AMEX',
    gradient: 'linear-gradient(135deg, #0f6b8f 0%, #22d3ee 100%)',
    accent: '#cffafe',
  },
  Citi: {
    label: 'Citi',
    short: 'citi',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #dc2626 100%)',
    accent: '#bfdbfe',
  },
  'Capital One': {
    label: 'Capital One',
    short: 'C1',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #1e3a8a 100%)',
    accent: '#fecaca',
  },
  BoA: {
    label: 'Bank of America',
    short: 'BofA',
    gradient: 'linear-gradient(135deg, #991b1b 0%, #1d4ed8 100%)',
    accent: '#fecaca',
  },
};

function fmtDollar(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtDelta(v: number): string {
  const sign = v >= 0 ? '+' : '−';
  return `${sign}${fmtDollar(Math.abs(v))}`;
}

function creditAnnualValue(credit: CardCredit): number {
  return credit.period === 'four_years' ? credit.amount / 4 : credit.amount;
}

function creditSummary(credits: CardCredit[]): string {
  if (credits.length === 0) return '';
  const [first, second, ...rest] = credits;
  const labels = [first, second]
    .filter(Boolean)
    .map((credit) => `${fmtDollar(credit.amount)} ${credit.label}${credit.period === 'four_years' ? ' / 4 yrs' : ''}`);
  return rest.length ? `${labels.join(' + ')} + ${rest.length} more` : labels.join(' + ');
}

function IssuerMark({ issuer }: { issuer: string }) {
  const brand = ISSUER_BRANDS[issuer] ?? {
    label: issuer,
    short: issuer.slice(0, 4).toUpperCase(),
    gradient: 'linear-gradient(135deg, #475569 0%, #94a3b8 100%)',
    accent: '#cbd5e1',
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-black/5"
      style={{ background: brand.gradient }}
      title={brand.label}
      aria-label={brand.label}
    >
      <span
        className="h-2 w-2 rounded-full bg-white/90 shadow-inner"
        style={{ boxShadow: `0 0 0 2px ${brand.accent}` }}
        aria-hidden="true"
      />
      {brand.short}
    </span>
  );
}

export default function WhatIfRecommender({ transactions, sources, cardBySource, onAssignCard }: Props) {
  const [disabledCreditKeys, setDisabledCreditKeys] = useState<Record<string, true>>({});
  const [creditsExpanded, setCreditsExpanded] = useState(false);
  const [allCardsExpanded, setAllCardsExpanded] = useState(false);

  if (transactions.length === 0) return null;

  const cardsWithCredits = CARDS.filter((card) => (card.credits?.length ?? 0) > 0);
  const enabledCreditKeys = new Set<string>();
  cardsWithCredits.forEach((card) => {
    card.credits?.forEach((credit) => {
      const key = creditKey(card.id, credit);
      if (!disabledCreditKeys[key]) enabledCreditKeys.add(key);
    });
  });

  function toggleCredit(cardId: string, credit: CardCredit, checked: boolean) {
    const key = creditKey(cardId, credit);
    setDisabledCreditKeys((prev) => {
      const next = { ...prev };
      if (checked) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  }

  const totalCreditCount = cardsWithCredits.reduce((sum, card) => sum + (card.credits?.length ?? 0), 0);

  const candidates = simulateAll(transactions, CARDS, enabledCreditKeys);
  const portfolio = simulatePortfolio(transactions, cardBySource, CARDS, enabledCreditKeys);
  const portfolioCardIds = new Set(portfolio.byCard.map((b) => b.card.id));
  const hasPortfolio = portfolio.byCard.length > 0;
  const months = candidates[0]?.monthsCovered ?? 0;
  const visibleCandidates = allCardsExpanded ? candidates : candidates.slice(0, 3);
  const hiddenCardCount = Math.max(candidates.length - visibleCandidates.length, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800">What if you used a different card?</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Replays your spending against each card's reward rules over {months} month{months === 1 ? '' : 's'} of data.
          {!hasPortfolio && ' Assign a card to each CSV below to estimate your current cash back and upside.'}
        </p>
      </div>

      {sources.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Assign cards to uploaded CSVs</h3>
              <p className="text-xs text-slate-400 mt-0.5">Map each statement source to the card you used.</p>
            </div>
            <span className="text-xs text-slate-400">{Object.keys(cardBySource).length} of {sources.length} assigned</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {sources.map((source) => (
              <label key={source} className="flex flex-col gap-1 text-xs text-slate-500">
                <span className="font-medium text-slate-600 truncate" title={source}>{source}</span>
                <select
                  value={cardBySource[source] ?? ''}
                  onChange={(e) => onAssignCard(source, e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Assign a card...</option>
                  {CARDS.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {cardsWithCredits.length > 0 && (
        <div className="border-b border-slate-100 bg-emerald-50/30">
          <button
            type="button"
            onClick={() => setCreditsExpanded((prev) => !prev)}
            aria-expanded={creditsExpanded}
            className="w-full px-6 py-4 text-left flex flex-wrap items-center justify-between gap-3 hover:bg-emerald-50/50 transition-colors"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-700">Credits to include</span>
              <span className="block text-xs text-slate-400 mt-0.5">Uncheck credits you do not expect to use.</span>
            </span>
            <span className="flex items-center gap-3 text-xs text-slate-400">
              <span>{enabledCreditKeys.size} of {totalCreditCount} selected</span>
              <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 font-medium text-emerald-700">
                {creditsExpanded ? 'Hide' : 'Show'} credits
              </span>
            </span>
          </button>
          {creditsExpanded && (
            <div className="px-6 pb-4 grid gap-3 lg:grid-cols-2">
              {cardsWithCredits.map((card) => (
                <div key={card.id} className="rounded-xl border border-emerald-100 bg-white/80 p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-2">{card.name}</div>
                  <div className="space-y-2">
                    {card.credits?.map((credit) => {
                      const key = creditKey(card.id, credit);
                      const checked = !disabledCreditKeys[key];
                      return (
                        <label key={key} className="flex items-start gap-2 text-xs text-slate-500">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleCredit(card.id, credit, e.target.checked)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-300"
                          />
                          <span>
                            <span className="font-medium text-slate-700">{fmtDollar(creditAnnualValue(credit))}/yr</span>{' '}
                            {credit.label}
                            {credit.period === 'four_years' && <span className="text-slate-400"> ({fmtDollar(credit.amount)} every 4 yrs)</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasPortfolio && (
        <div className="px-6 py-4 bg-blue-50/40 border-b border-blue-100/60">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Your estimated cash back</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{fmtDollar(portfolio.netRewards)}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {fmtDollar(portfolio.grossRewards)} estimated rewards
                {portfolio.creditsApplied > 0 ? ` + ${fmtDollar(portfolio.creditsApplied)} credits` : ''}
                {portfolio.feeCharged > 0 ? ` − ${fmtDollar(portfolio.feeCharged)} fees` : ''}
                {' · '}{portfolio.byCard.length} assigned card{portfolio.byCard.length === 1 ? '' : 's'}
              </div>
            </div>
            {portfolio.unmappedCount > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                {portfolio.unmappedCount} txn{portfolio.unmappedCount === 1 ? '' : 's'} ({fmtDollar(portfolio.unmappedSpend)}) not assigned to a card
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium w-12 text-center">#</th>
              <th className="px-4 py-3 font-medium">Card</th>
              <th className="px-4 py-3 font-medium text-right">Rewards</th>
              <th className="px-4 py-3 font-medium text-right">Credits</th>
              <th className="px-4 py-3 font-medium text-right">Fee</th>
              <th className="px-4 py-3 font-medium text-right">Net</th>
              {hasPortfolio && <th className="px-4 py-3 font-medium text-right">Expected upside</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visibleCandidates.map((r, i) => {
              const inPortfolio = portfolioCardIds.has(r.cardId);
              const delta = r.netRewards - portfolio.netRewards;
              const isTop = i === 0;
              return (
                <tr
                  key={r.cardId}
                  className={`transition-colors ${inPortfolio ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-3 text-center text-xs text-slate-400 font-medium">
                    {isTop ? <span className="text-amber-500">★</span> : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <IssuerMark issuer={r.issuer} />
                      <span className="font-medium text-slate-700">{r.cardName}</span>
                      {inPortfolio && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium uppercase">
                          assigned
                        </span>
                      )}
                    </div>
                    {r.credits.length > 0 && (
                      <div className="mt-1 text-[11px] text-slate-400">{creditSummary(r.credits)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtDollar(r.grossRewards)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {r.creditsApplied > 0 ? `+${fmtDollar(r.creditsApplied)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {r.feeCharged > 0 ? `−${fmtDollar(r.feeCharged)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtDollar(r.netRewards)}</td>
                  {hasPortfolio && (
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'
                      }`}
                    >
                      {fmtDelta(delta)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {candidates.length > 3 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex justify-center">
          <button
            type="button"
            onClick={() => setAllCardsExpanded((prev) => !prev)}
            aria-expanded={allCardsExpanded}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-100 hover:border-blue-200 bg-blue-50/60 px-3 py-1.5 rounded-full transition-colors"
          >
            {allCardsExpanded ? 'Show top 3 only' : `Show ${hiddenCardCount} more card${hiddenCardCount === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-400">
        Reward estimates use issuer-published base rates and annualized statement credits if fully used, but don't model
        welcome bonuses, rotating categories, or narrow portal-only bonuses separately. Fees and credits are prorated by months of data.
        The "what if" simulation assumes the candidate card is used for every transaction in this period.
      </div>
    </div>
  );
}
