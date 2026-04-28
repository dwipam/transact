import type { Transaction } from '../types';
import { cleanMerchantDisplay } from './categories';

export interface MonthlyCategorySpend {
  month: string; // "YYYY-MM"
  [category: string]: number | string;
}

export interface RecurringMerchant {
  merchant: string;
  months: string[];
  totalSpend: number;
  avgMonthly: number;
  count: number;
}

export interface SummaryStats {
  totalSpend: number;
  totalTransactions: number;
  avgMonthlySpend: number;
  topCategory: string;
  months: number;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeMerchant(desc: string): string {
  return cleanMerchantDisplay(desc)
    .toLowerCase()
    .replace(/\b(llc|inc|ltd|co|corp)\b\.?/gi, '')
    .replace(/\s+\d{2}\/\d{2}/g, '')   // strip inline dates
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function getMonthlyCategorySpend(transactions: Transaction[]): MonthlyCategorySpend[] {
  const expenses = transactions.filter((t) => t.amount > 0);
  const map = new Map<string, Map<string, number>>();

  for (const t of expenses) {
    const month = monthKey(t.date);
    if (!map.has(month)) map.set(month, new Map());
    const cats = map.get(month)!;
    cats.set(t.category, (cats.get(t.category) || 0) + t.amount);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cats]) => {
      const entry: MonthlyCategorySpend = { month };
      cats.forEach((v, k) => { entry[k] = Math.round(v * 100) / 100; });
      return entry;
    });
}

export function getRecurringMerchants(transactions: Transaction[]): RecurringMerchant[] {
  const expenses = transactions.filter((t) => t.amount > 0);
  const merchantMonths = new Map<string, Map<string, number>>();

  for (const t of expenses) {
    const key = normalizeMerchant(t.description);
    const month = monthKey(t.date);
    if (!merchantMonths.has(key)) merchantMonths.set(key, new Map());
    const months = merchantMonths.get(key)!;
    months.set(month, (months.get(month) || 0) + t.amount);
  }

  const results: RecurringMerchant[] = [];
  merchantMonths.forEach((months, merchant) => {
    if (months.size >= 2) {
      const monthList = Array.from(months.keys()).sort();
      const totalSpend = Array.from(months.values()).reduce((a, b) => a + b, 0);
      results.push({
        merchant,
        months: monthList,
        totalSpend: Math.round(totalSpend * 100) / 100,
        avgMonthly: Math.round((totalSpend / months.size) * 100) / 100,
        count: months.size,
      });
    }
  });

  return results.sort((a, b) => b.totalSpend - a.totalSpend);
}

export function getAllCategories(data: MonthlyCategorySpend[]): string[] {
  const cats = new Set<string>();
  for (const row of data) {
    Object.keys(row).filter((k) => k !== 'month').forEach((k) => cats.add(k));
  }
  return Array.from(cats).sort();
}

const MAX_CHART_CATS = 8;

// Returns chart data limited to top N categories by total spend; remainder bucketed as "Other"
export function getChartData(
  data: MonthlyCategorySpend[],
  categories: string[],
): { data: MonthlyCategorySpend[]; categories: string[] } {
  if (categories.length <= MAX_CHART_CATS) return { data, categories };

  const totals = new Map<string, number>();
  for (const row of data) {
    for (const cat of categories) {
      totals.set(cat, (totals.get(cat) || 0) + ((row[cat] as number) || 0));
    }
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const topCats = sorted.slice(0, MAX_CHART_CATS - 1).map(([c]) => c);
  const otherCats = new Set(sorted.slice(MAX_CHART_CATS - 1).map(([c]) => c));
  const otherLabel = topCats.includes('Other') ? 'Other Categories' : 'Other';

  const limitedData = data.map((row) => {
    const newRow: MonthlyCategorySpend = { month: row.month };
    for (const cat of topCats) newRow[cat] = (row[cat] as number) || 0;
    let other = 0;
    otherCats.forEach((c) => { other += (row[c] as number) || 0; });
    if (other > 0) newRow[otherLabel] = Math.round(other * 100) / 100;
    return newRow;
  });

  return {
    data: limitedData,
    categories: [...topCats, ...(otherCats.size > 0 ? [otherLabel] : [])],
  };
}

export interface MonthlyTotal {
  month: string;
  total: number;
}

export function getMonthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const expenses = transactions.filter((t) => t.amount > 0);
  const map = new Map<string, number>();
  for (const t of expenses) {
    const month = monthKey(t.date);
    map.set(month, (map.get(month) || 0) + t.amount);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
}

export interface CategoryTotal {
  category: string;
  total: number;
  pct: number;
}

export function getCategoryTotals(transactions: Transaction[]): CategoryTotal[] {
  const expenses = transactions.filter((t) => t.amount > 0);
  const map = new Map<string, number>();
  for (const t of expenses) map.set(t.category, (map.get(t.category) || 0) + t.amount);
  const grand = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({
      category,
      total: Math.round(total * 100) / 100,
      pct: Math.round((total / grand) * 1000) / 10,
    }));
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

export function getTopMerchants(transactions: Transaction[], n = 10): MerchantTotal[] {
  const expenses = transactions.filter((t) => t.amount > 0);
  const map = new Map<string, { total: number; count: number }>();
  for (const t of expenses) {
    const key = normalizeMerchant(t.description);
    const e = map.get(key) ?? { total: 0, count: 0 };
    map.set(key, { total: e.total + t.amount, count: e.count + 1 });
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, n)
    .map(([merchant, { total, count }]) => ({ merchant, total: Math.round(total * 100) / 100, count }));
}

export function getSummaryStats(transactions: Transaction[], monthlyData: MonthlyCategorySpend[]): SummaryStats {
  const expenses = transactions.filter((t) => t.amount > 0);
  const totalSpend = expenses.reduce((s, t) => s + t.amount, 0);
  const months = monthlyData.length || 1;

  const catTotals = new Map<string, number>();
  for (const t of expenses) {
    catTotals.set(t.category, (catTotals.get(t.category) || 0) + t.amount);
  }
  let topCategory = 'N/A';
  let topAmt = 0;
  catTotals.forEach((v, k) => { if (v > topAmt) { topAmt = v; topCategory = k; } });

  return {
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalTransactions: expenses.length,
    avgMonthlySpend: Math.round((totalSpend / months) * 100) / 100,
    topCategory,
    months,
  };
}
