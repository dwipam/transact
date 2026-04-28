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

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
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

  function reset() { setTransactions([]); setLoadedFiles([]); setSelectedMonth(null); }

  const monthlyData   = getMonthlyCategorySpend(transactions);
  const allCategories = getAllCategories(monthlyData);
  const { data: chartData, categories: chartCategories } = getChartData(monthlyData, allCategories);
  const monthlyTotals = getMonthlyTotals(transactions);
  const categoryTotals = getCategoryTotals(transactions);
  const topMerchants  = getTopMerchants(transactions);
  const recurring     = getRecurringMerchants(transactions);
  const stats         = getSummaryStats(transactions, monthlyData);
  const hasData       = transactions.length > 0;
  const chartFilter = selectedMonth ? {
    month: selectedMonth,
    label: fmtMonthLong(selectedMonth),
  } : null;

  function handleMonthSelect(month: string) {
    const isSameSelection = selectedMonth === month;
    setSelectedMonth(isSameSelection ? null : month);
    if (!isSameSelection) {
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
            <span className="text-slate-400 text-sm">credit card analysis</span>
          </div>
          {hasData && (
            <button
              onClick={reset}
              className="text-xs text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear all
            </button>
          )}
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
                    selectedMonth={selectedMonth}
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

            {/* Transactions */}
            <section ref={transactionsRef}>
              <SectionLabel>Transactions</SectionLabel>
              <TransactionTable
                transactions={transactions}
                chartFilter={chartFilter}
                onClearChartFilter={() => setSelectedMonth(null)}
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
