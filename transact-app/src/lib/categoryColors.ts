export const CATEGORY_COLORS: Record<string, string> = {
  Dining: '#f97316',
  Groceries: '#22c55e',
  Shopping: '#3b82f6',
  Travel: '#06b6d4',
  Transportation: '#8b5cf6',
  'Gas & Auto': '#eab308',
  'Bills & Utilities': '#64748b',
  Health: '#ec4899',
  Entertainment: '#a855f7',
  Business: '#0ea5e9',
  Fees: '#ef4444',
  Shipping: '#84cc16',
  Home: '#f59e0b',
  Personal: '#d946ef',
  Education: '#14b8a6',
  Other: '#94a3b8',
  'Other Categories': '#94a3b8',
  Uncategorized: '#cbd5e1',
};

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
];

export function catColor(cat: string, idx: number): string {
  return CATEGORY_COLORS[cat] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}
