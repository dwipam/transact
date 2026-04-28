import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { CategoryTotal } from '../lib/analyze';
import { catColor } from '../lib/categoryColors';

interface Props {
  data: CategoryTotal[];
}

function fmtDollar(v: number) {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CategoryBreakdown({ data }: Props) {
  if (!data.length) return null;

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload as CategoryTotal | undefined;
    if (!item) return null;
    const { category, total, pct } = item;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-slate-700">{category}</p>
        <p className="text-slate-800 font-bold mt-0.5">{fmtDollar(total)}</p>
        <p className="text-slate-400">{pct}% of spend</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 h-full">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Category Breakdown</h2>
      <div className="flex gap-4 items-start">
        {/* Donut */}
        <div className="flex-shrink-0" style={{ width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={64}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.category} fill={catColor(entry.category, i)} />
                ))}
              </Pie>
              <Tooltip content={renderTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend list */}
        <div className="flex-1 min-w-0 space-y-1 overflow-y-auto max-h-36">
          {data.map((entry, i) => (
            <div key={entry.category} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: catColor(entry.category, i) }}
              />
              <span className="text-slate-600 truncate flex-1">{entry.category}</span>
              <span className="text-slate-400 flex-shrink-0">{entry.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
