import type { RecurringMerchant } from '../lib/analyze';
import { cleanMerchantDisplay } from '../lib/categories';

interface Props {
  merchants: RecurringMerchant[];
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
}

export default function RecurringTable({ merchants }: Props) {
  if (!merchants.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800">Recurring Merchants</h2>
        <p className="text-xs text-slate-400 mt-0.5">Merchants appearing in 2+ months</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-6 py-3 font-medium">Merchant</th>
              <th className="px-4 py-3 font-medium">Months</th>
              <th className="px-4 py-3 font-medium text-right">Avg / Month</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {merchants.map((m) => (
              <tr key={m.merchant} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-700">{cleanMerchantDisplay(m.merchant)}</td>
                <td className="px-4 py-3 text-slate-500">
                  <div className="flex flex-wrap gap-1">
                    {m.months.map((mo) => (
                      <span key={mo} className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">
                        {fmtMonth(mo)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  ${m.avgMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">
                  ${m.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
