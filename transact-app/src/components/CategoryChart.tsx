import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { MonthlyCategorySpend } from '../lib/analyze';

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
  Uncategorized: '#cbd5e1',
};

const FALLBACK_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1',
];

export function catColor(cat: string, idx: number): string {
  return CATEGORY_COLORS[cat] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

interface Props {
  data: MonthlyCategorySpend[];
  categories: string[];
  selectedBar?: { month: string; category: string } | null;
  onBarSelect?: (selection: { month: string; category: string }) => void;
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
}

function fmtDollar(v: number) {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function CategoryChart({ data, categories, selectedBar, onBarSelect }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggle = (cat: string) =>
    setHidden((prev) => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });

  // Defined as a stable render prop so Recharts doesn't remount it
  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const visible = (payload as any[]).filter((p) => !hidden.has(p.dataKey) && Number(p.value) > 0);
    if (!visible.length) return null;
    const total = visible.reduce((s, p) => s + Number(p.value), 0);
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-40">
        <p className="font-semibold text-slate-600 mb-2">{fmtMonth(label)}</p>
        {visible.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
              {p.dataKey}
            </span>
            <span className="font-medium text-slate-800">{fmtDollar(Number(p.value))}</span>
          </div>
        ))}
        {visible.length > 1 && (
          <div className="border-t border-slate-100 mt-1.5 pt-1.5 flex justify-between font-semibold text-slate-700">
            <span>Total</span><span>{fmtDollar(total)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-800">Spend by Category &amp; Month</h2>
        {hidden.size > 0 && (
          <button onClick={() => setHidden(new Set())} className="text-xs text-blue-500 hover:text-blue-700">
            Show all
          </button>
        )}
      </div>

      {/* Clickable legend pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map((cat, i) => {
          const color = catColor(cat, i);
          const isHidden = hidden.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              title={isHidden ? `Show ${cat}` : `Hide ${cat}`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all duration-150 select-none"
              style={{
                background: isHidden ? 'transparent' : color + '18',
                color: isHidden ? '#94a3b8' : color,
                borderColor: isHidden ? '#e2e8f0' : color + '50',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: isHidden ? '#e2e8f0' : color }}
              />
              {cat}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickFormatter={fmtMonth}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tickFormatter={fmtDollar} tick={{ fontSize: 11 }} width={68} axisLine={false} tickLine={false} />
          <Tooltip
            content={renderTooltip}
            wrapperStyle={{ zIndex: 50 }}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            allowEscapeViewBox={{ x: false, y: true }}
          />
          {categories.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="a"
              hide={hidden.has(cat)}
              fill={catColor(cat, i)}
              radius={i === categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              onClick={(_, index) => onBarSelect?.({ month: data[index].month, category: cat })}
            >
              {data.map((row, j) => {
                const isSelected = selectedBar?.month === row.month && selectedBar.category === cat;
                const hasSelection = Boolean(selectedBar);
                return (
                  <Cell
                    key={j}
                    fill={catColor(cat, i)}
                    fillOpacity={hasSelection && !isSelected ? 0.35 : 1}
                    cursor="pointer"
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
