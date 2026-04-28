import { useState } from 'react';
import type { Transaction } from '../types';
import { CATEGORY_COLORS } from '../lib/categoryColors';
import { cleanMerchantDisplay } from '../lib/categories';

interface Props {
  transactions: Transaction[];
  chartFilter?: {
    month: string;
    label: string;
  } | null;
  onClearChartFilter?: () => void;
}

const PAGE_SIZE = 50;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function TransactionTable({ transactions, chartFilter, onClearChartFilter }: Props) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const expenses = transactions.filter((t) => t.amount > 0);
  const categories = Array.from(new Set(expenses.map((t) => t.category))).sort();

  const filtered = expenses
    .filter((t) => !chartFilter || monthKey(t.date) === chartFilter.month)
    .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => !category || t.category === category)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pages - 1, 0));
  const slice = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(0); }
  function handleCategory(v: string) { setCategory(v); setPage(0); }

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
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
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
