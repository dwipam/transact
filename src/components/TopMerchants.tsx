import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { MerchantTotal } from '../lib/analyze';
import { cleanMerchantDisplay } from '../lib/categories';

interface Props {
  data: MerchantTotal[];
}

function fmtDollar(v: number) {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const BAR_COLOR = '#6366f1';

export default function TopMerchants({ data }: Props) {
  if (!data.length) return null;

  // Recharts layout="vertical" for horizontal bar chart — longest bars at top
  const display = [...data].reverse().map((d) => ({
    ...d,
    label: cleanMerchantDisplay(d.merchant).slice(0, 28),
  }));

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload as (MerchantTotal & { label: string }) | undefined;
    if (!item) return null;
    const { merchant, total, count } = item;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-slate-700 capitalize mb-1">{merchant}</p>
        <p className="font-bold text-slate-800">{fmtDollar(total)}</p>
        <p className="text-slate-400 mt-0.5">{count} transaction{count !== 1 ? 's' : ''}</p>
      </div>
    );
  };

  const maxLen = Math.max(...display.map((d) => d.label.length));
  const yWidth = Math.min(Math.max(maxLen * 6, 80), 160);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Top Merchants</h2>
      <ResponsiveContainer width="100%" height={data.length * 32 + 16}>
        <BarChart data={display} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barSize={14}>
          <XAxis type="number" tickFormatter={fmtDollar} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11 }}
            width={yWidth}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {display.map((_, i) => (
              <Cell
                key={i}
                fill={BAR_COLOR}
                opacity={0.5 + 0.5 * ((i + 1) / display.length)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
