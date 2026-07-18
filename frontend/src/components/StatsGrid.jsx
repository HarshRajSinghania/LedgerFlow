import React from 'react';
import { DollarSign, FileSpreadsheet, ShieldAlert, CheckCircle2, RefreshCw, Layers } from 'lucide-react';

export default function StatsGrid({ stats }) {
  if (!stats) return null;

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculatePercentage = (part, total) => {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  };

  const matchedPercent = calculatePercentage(stats.matched, stats.total_lines);
  const discrepancyCount = stats.missing_in_invoice + stats.missing_in_po + stats.value_mismatch + stats.duplicates;
  const discrepancyPercent = calculatePercentage(discrepancyCount, stats.total_lines);

  const metrics = [
    {
      label: 'Financial Exposure',
      value: formatCurrency(stats.total_exposure),
      icon: DollarSign,
      color: stats.total_exposure > 0 ? 'text-red-400' : 'text-slate-400',
      bgGlow: stats.total_exposure > 0 ? 'from-red-500/10' : 'from-slate-500/5',
      border: stats.total_exposure > 0 ? 'border-red-500/20' : 'border-slate-800',
      desc: 'Sum of discrepancies requiring cash flow corrections'
    },
    {
      label: 'Matched Lines',
      value: `${stats.matched} / ${stats.total_lines}`,
      subValue: `${matchedPercent}% match rate`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10',
      border: 'border-emerald-500/20',
      desc: 'Purchase orders successfully aligned to invoice entries'
    },
    {
      label: 'Active Discrepancies',
      value: discrepancyCount.toString(),
      subValue: `${discrepancyPercent}% exception rate`,
      icon: ShieldAlert,
      color: discrepancyCount > 0 ? 'text-amber-400' : 'text-slate-400',
      bgGlow: discrepancyCount > 0 ? 'from-amber-500/10' : 'from-slate-500/5',
      border: discrepancyCount > 0 ? 'border-amber-500/20' : 'border-slate-800',
      desc: 'Total exceptions needing finance team review'
    },
    {
      label: 'Total Intake Rows',
      value: `${stats.po_row_count + stats.invoice_row_count}`,
      subValue: `${stats.po_row_count} POs • ${stats.invoice_row_count} Invoices`,
      icon: Layers,
      color: 'text-sky-400',
      bgGlow: 'from-sky-500/10',
      border: 'border-sky-500/20',
      desc: 'Grand total rows processed from imported sheets'
    }
  ];

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className={`glass-panel border ${m.border} rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px]`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${m.bgGlow} to-transparent rounded-bl-full pointer-events-none`} />
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">{m.label}</span>
                <span className="text-2xl font-bold text-slate-100 block">{m.value}</span>
                {m.subValue && <span className="text-xs text-slate-400 block mt-0.5">{m.subValue}</span>}
              </div>
              <div className={`p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 ${m.color}`}>
                <m.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 border-t border-slate-800/50 pt-2">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Detailed Breakdowns & Progress Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Exception breakdown details */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 md:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 tracking-wide mb-4">Reconciliation Discrepancy Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Missing in PO</span>
              <span className="block text-xl font-semibold text-slate-200 mt-1">{stats.missing_in_po}</span>
              <span className="text-[10px] text-orange-400/80 block mt-1">Invoice row has no PO match</span>
            </div>
            <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Missing in Invoice</span>
              <span className="block text-xl font-semibold text-slate-200 mt-1">{stats.missing_in_invoice}</span>
              <span className="text-[10px] text-yellow-400/80 block mt-1">PO row has no Invoice match</span>
            </div>
            <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Value Mismatch</span>
              <span className="block text-xl font-semibold text-slate-200 mt-1">{stats.value_mismatch}</span>
              <span className="text-[10px] text-rose-400/80 block mt-1">Pricing or quantity differs</span>
            </div>
            <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Duplicates</span>
              <span className="block text-xl font-semibold text-slate-200 mt-1">{stats.duplicates}</span>
              <span className="text-[10px] text-pink-400/80 block mt-1">Multiple keys in source file</span>
            </div>
          </div>
        </div>

        {/* Visual Progress Doughnut Ring (Custom SVG) */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-slate-300 tracking-wide mb-2">Reconciliation Accuracy</h3>
          <div className="flex items-center justify-center py-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Matched Progress Ring */}
                <path
                  className="text-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="3.5"
                  strokeDasharray={`${matchedPercent}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Discrepancy Progress Ring */}
                {discrepancyPercent > 0 && (
                  <path
                    className="text-amber-500 transition-all duration-1000 ease-out"
                    strokeWidth="3.5"
                    strokeDasharray={`${discrepancyPercent}, 100`}
                    strokeDashoffset={`-${matchedPercent}`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-slate-100">{matchedPercent}%</span>
                <span className="text-[9px] font-semibold text-slate-500 tracking-wider uppercase">Aligned</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-2 border-t border-slate-800/40 pt-3">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Matched</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Exceptions</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" /> Unmatched</span>
          </div>
        </div>
      </div>
    </div>
  );
}
