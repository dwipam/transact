import { useRef, useState } from 'react';
import type { Transaction } from './types';
import { parseCSVFile } from './lib/parseCSV';
import {
  getMonthlyCategorySpend,
  getMonthlyTotals,
  getCategoryTotals,
  getTopMerchants,
  getRecurringMerchants,
  getAllCategories,
  getSummaryStats,
  getChartData,
} from './lib/analyze';
import UploadZone from './components/UploadZone';
import SummaryCards from './components/SummaryCards';
import SpendTrend from './components/SpendTrend';
import CategoryChart from './components/CategoryChart';
import CategoryBreakdown from './components/CategoryBreakdown';
import TopMerchants from './components/TopMerchants';
import RecurringTable from './components/RecurringTable';
import TransactionTable from './components/TransactionTable';
import WhatIfRecommender from './components/WhatIfRecommender';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [cardBySource, setCardBySource] = useState<Record<string, string>>({});
  const transactionsRef = useRef<HTMLElement>(null);

  async function handleFiles(files: File[]) {
    setLoading(true);
    try {
      const results = await Promise.all(files.map(parseCSVFile));
      setTransactions((prev) => [...prev, ...results.flat()]);
      setLoadedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTransactions([]);
    setLoadedFiles([]);
    setSelectedMonths([]);
    setCardBySource({});
  }

  function assignCardToSource(source: string, cardId: string) {
    setCardBySource((prev) => {
      if (!cardId) {
        const next = { ...prev };
        delete next[source];
        return next;
      }
      return { ...prev, [source]: cardId };
    });
  }

  function removeTransaction(transaction: Transaction) {
    setTransactions((prev) => prev.filter((t) => t !== transaction));
  }

  const monthlyData   = getMonthlyCategorySpend(transactions);
  const allCategories = getAllCategories(monthlyData);
  const { data: chartData, categories: chartCategories } = getChartData(monthlyData, allCategories);
  const selectedMonthSet = new Set(selectedMonths);
  const scopedTransactions = selectedMonths.length
    ? transactions.filter((t) => selectedMonthSet.has(monthKey(t.date)))
    : transactions;
  const scopedMonthlyData = getMonthlyCategorySpend(scopedTransactions);
  const monthlyTotals = getMonthlyTotals(scopedTransactions);
  const categoryTotals = getCategoryTotals(scopedTransactions);
  const topMerchants  = getTopMerchants(scopedTransactions);
  const recurring     = getRecurringMerchants(scopedTransactions);
  const stats         = getSummaryStats(scopedTransactions, scopedMonthlyData);
  const sources       = Array.from(new Set(transactions.map((t) => t.source))).sort();
  const hasData       = transactions.length > 0;
  const chartFilter = selectedMonths.length ? {
    months: selectedMonths,
    label: fmtMonthSelection(selectedMonths),
  } : null;

  function handleMonthSelect(month: string) {
    const isSelected = selectedMonths.includes(month);
    const nextMonths = isSelected
      ? selectedMonths.filter((m) => m !== month)
      : [...selectedMonths, month].sort();
    setSelectedMonths(nextMonths);
    if (!isSelected) {
      requestAnimationFrame(() => transactionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-800">Transact</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 text-sm">credit card spend analyzer</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/dwipam/transact"
              target="_blank"
              rel="noopener noreferrer"
              title="View source & contribute on GitHub"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-1.96c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z"/>
              </svg>
              GitHub
            </a>
            {hasData && (
              <button
                onClick={reset}
                className="text-xs text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* Upload */}
        <section>
          <UploadZone onFiles={handleFiles} loading={loading} />
          {loadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {loadedFiles.map((f, i) => (
                <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span>✓</span> {f}
                </span>
              ))}
            </div>
          )}
        </section>

        {hasData && (
          <>
            {/* Summary */}
            <section>
              <SectionLabel>Summary</SectionLabel>
              <SummaryCards stats={stats} />
            </section>

            {/* Trend + breakdown */}
            <section>
              <SectionLabel>Trends</SectionLabel>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <SpendTrend data={monthlyTotals} />
                </div>
                <div>
                  <CategoryBreakdown data={categoryTotals} />
                </div>
              </div>
            </section>

            {/* Category chart + top merchants */}
            <section>
              <SectionLabel>Category Detail</SectionLabel>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <CategoryChart
                    data={chartData}
                    categories={chartCategories}
                    selectedMonths={selectedMonths}
                    onMonthSelect={handleMonthSelect}
                  />
                </div>
                <div>
                  <TopMerchants data={topMerchants} />
                </div>
              </div>
            </section>

            {/* Recurring */}
            {recurring.length > 0 && (
              <section>
                <SectionLabel>Recurring Charges</SectionLabel>
                <RecurringTable merchants={recurring} />
              </section>
            )}

            {/* What-if recommender */}
            <section>
              <SectionLabel>Card Recommendations</SectionLabel>
              <WhatIfRecommender
                transactions={scopedTransactions}
                sources={sources}
                cardBySource={cardBySource}
                onAssignCard={assignCardToSource}
              />
            </section>

            {/* Transactions */}
            <section ref={transactionsRef}>
              <SectionLabel>Transactions</SectionLabel>
              <TransactionTable
                transactions={transactions}
                chartFilter={chartFilter}
                onClearChartFilter={() => setSelectedMonths([])}
                onRemoveTransaction={removeTransaction}
              />
            </section>
          </>
        )}

        {!hasData && !loading && (
          <p className="text-center text-slate-400 text-sm py-6">
            Upload CSV statements to get started — all data stays in your browser.
          </p>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{children}</h2>;
}

function fmtMonthLong(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function fmtMonthSelection(months: string[]) {
  if (months.length === 1) return fmtMonthLong(months[0]);
  return `${months.length} months selected`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
