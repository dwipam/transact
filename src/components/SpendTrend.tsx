import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { MonthlyTotal } from '../lib/analyze';

interface Props {
  data: MonthlyTotal[];
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
}

function fmtDollar(v: number) {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function SpendTrend({ data }: Props) {
  if (data.length < 2) return null;

  const avg = data.reduce((s, d) => s + d.total, 0) / data.length;
  const display = data.map((d) => ({ ...d, month: fmtMonth(d.month) }));

  const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const val = Number(payload[0].value);
    const diff = val - avg;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-slate-600 mb-1">{label}</p>
        <p className="font-bold text-slate-800 text-sm">{fmtDollar(val)}</p>
        <p className={`mt-0.5 ${diff >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
          {diff >= 0 ? '▲' : '▼'} {fmtDollar(Math.abs(diff))} vs avg
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-slate-800">Monthly Spend Trend</h2>
        <span className="text-xs text-slate-400">avg {fmtDollar(avg)}/mo</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={display} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtDollar} tick={{ fontSize: 11 }} width={68} axisLine={false} tickLine={false} />
          <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
          <Tooltip content={renderTooltip} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#spendGrad)"
            dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
