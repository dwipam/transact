import type { SummaryStats } from '../lib/analyze';

interface Props {
  stats: SummaryStats;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function SummaryCards({ stats }: Props) {
  const cards = [
    { label: 'Total Spend', value: fmt(stats.totalSpend), icon: '💳' },
    { label: 'Avg / Month', value: fmt(stats.avgMonthlySpend), icon: '📅' },
    { label: 'Transactions', value: stats.totalTransactions.toLocaleString(), icon: '🧾' },
    { label: 'Top Category', value: stats.topCategory, icon: '🏷️' },
    { label: 'Months Covered', value: String(stats.months), icon: '📆' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-2xl mb-1">{c.icon}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">{c.label}</div>
          <div className="text-lg font-semibold text-slate-800 mt-0.5 truncate">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
