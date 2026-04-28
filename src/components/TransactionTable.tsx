import { useState } from 'react';
import type { Transaction } from '../types';
import { CATEGORY_COLORS } from '../lib/categoryColors';
import { cleanMerchantDisplay } from '../lib/categories';

interface Props {
  transactions: Transaction[];
  chartFilter?: {
    months: string[];
    label: string;
  } | null;
  onClearChartFilter?: () => void;
  onRemoveTransaction?: (transaction: Transaction) => void;
}

const PAGE_SIZE = 50;

type SortKey = 'date' | 'description' | 'category' | 'source' | 'amount';
type SortDirection = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const SORT_LABELS: Record<SortKey, string> = {
  date: 'Date',
  description: 'Description',
  category: 'Category',
  source: 'Source',
  amount: 'Amount',
};

const DEFAULT_DIRECTIONS: Record<SortKey, SortDirection> = {
  date: 'desc',
  description: 'asc',
  category: 'asc',
  source: 'asc',
  amount: 'desc',
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function TransactionTable({ transactions, chartFilter, onClearChartFilter, onRemoveTransaction }: Props) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'date', direction: 'desc' });

  const expenses = transactions.filter((t) => t.amount > 0);
  const categories = Array.from(new Set(expenses.map((t) => t.category))).sort();

  const filtered = expenses
    .filter((t) => !chartFilter || chartFilter.months.includes(monthKey(t.date)))
    .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => !category || t.category === category)
    .sort((a, b) => compareTransactions(a, b, sort));

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pages - 1, 0));
  const slice = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(0); }
  function handleCategory(v: string) { setCategory(v); setPage(0); }
  function handleSort(key: SortKey) {
    setSort((prev) => ({
      key,
      direction: prev.key === key
        ? (prev.direction === 'asc' ? 'desc' : 'asc')
        : DEFAULT_DIRECTIONS[key],
    }));
    setPage(0);
  }

  const catColor = (cat: string) => CATEGORY_COLORS[cat] ?? '#94a3b8';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center bg-slate-50/60">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search merchants…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>
        <select
          value={category}
          onChange={(e) => handleCategory(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-40"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {chartFilter && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
            Chart filter: {chartFilter.label}
            <button
              onClick={onClearChartFilter}
              className="text-blue-500 hover:text-blue-700"
              title="Clear chart filter"
            >
              ✕
            </button>
          </span>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} transactions</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
              <SortableHeader sortKey="date" sort={sort} onSort={handleSort} className="px-6" />
              <SortableHeader sortKey="description" sort={sort} onSort={handleSort} className="px-4" />
              <SortableHeader sortKey="category" sort={sort} onSort={handleSort} className="px-4" />
              <SortableHeader sortKey="source" sort={sort} onSort={handleSort} className="px-4" />
              <SortableHeader sortKey="amount" sort={sort} onSort={handleSort} className="px-4 text-right" align="right" />
              <th className="px-6 py-3 font-medium text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {slice.map((t, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-6 py-2.5 text-slate-500 whitespace-nowrap text-xs">
                  {t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate font-medium" title={t.description}>
                  {cleanMerchantDisplay(t.description)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: catColor(t.category) + '20', color: catColor(t.category) }}
                  >
                    {t.category}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-400 text-xs truncate max-w-28">{t.source}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                  ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveTransaction?.(t)}
                    className="text-xs text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 px-2 py-1 rounded-md transition-colors"
                    title="Remove transaction"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-slate-50/40">
          <span className="text-xs">Page {currentPage + 1} of {pages}</span>
          <div className="flex gap-1">
            <button
              disabled={currentPage === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-white text-xs"
            >← Prev</button>
            <button
              disabled={currentPage >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-white text-xs"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function compareTransactions(a: Transaction, b: Transaction, sort: SortState) {
  const multiplier = sort.direction === 'asc' ? 1 : -1;
  let result: number;

  if (sort.key === 'date') result = a.date.getTime() - b.date.getTime();
  else if (sort.key === 'amount') result = a.amount - b.amount;
  else if (sort.key === 'description') result = cleanMerchantDisplay(a.description).localeCompare(cleanMerchantDisplay(b.description));
  else result = a[sort.key].localeCompare(b[sort.key]);

  if (result === 0) return b.date.getTime() - a.date.getTime();
  return result * multiplier;
}

function SortableHeader({
  sortKey,
  sort,
  onSort,
  className,
  align = 'left',
}: {
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className: string;
  align?: 'left' | 'right';
}) {
  const isActive = sort.key === sortKey;
  const arrow = isActive ? (sort.direction === 'asc' ? '↑' : '↓') : '↕';

  return (
    <th className={`${className} py-3 font-medium`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-slate-700 transition-colors ${align === 'right' ? 'justify-end w-full' : ''}`}
        aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{SORT_LABELS[sortKey]}</span>
        <span className={isActive ? 'text-slate-700' : 'text-slate-300'}>{arrow}</span>
      </button>
    </th>
  );
}
