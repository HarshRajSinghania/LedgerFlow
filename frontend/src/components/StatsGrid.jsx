import React from 'react';
import { DollarSign, FileSpreadsheet, ShieldAlert, CheckCircle2, Layers } from 'lucide-react';

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
      color: stats.total_exposure > 0 ? 'text-[#be5a38]' : 'text-[#73675c]',
      border: stats.total_exposure > 0 ? 'border-[#be5a38]/40' : 'border-[#dcd6cd]',
      bgGlow: stats.total_exposure > 0 ? 'bg-[#fdf9f7]' : 'bg-[#ffffff]',
      desc: 'Sum of discrepancies requiring ledger adjustments'
    },
    {
      label: 'Matched Lines',
      value: `${stats.matched} / ${stats.total_lines}`,
      subValue: `${matchedPercent}% Alignment Rate`,
      icon: CheckCircle2,
      color: 'text-[#3c5946]',
      border: 'border-[#3c5946]/40',
      bgGlow: 'bg-[#fcfdfc]',
      desc: 'Purchase orders aligned with invoice items'
    },
    {
      label: 'Active Discrepancies',
      value: discrepancyCount.toString(),
      subValue: `${discrepancyPercent}% Exception Rate`,
      icon: ShieldAlert,
      color: discrepancyCount > 0 ? 'text-[#c2923f]' : 'text-[#73675c]',
      border: discrepancyCount > 0 ? 'border-[#c2923f]/40' : 'border-[#dcd6cd]',
      bgGlow: discrepancyCount > 0 ? 'bg-[#fcfbf9]' : 'bg-[#ffffff]',
      desc: 'Line items flagged for manual review'
    },
    {
      label: 'Ingestion Count',
      value: `${stats.po_row_count + stats.invoice_row_count}`,
      subValue: `${stats.po_row_count} POs • ${stats.invoice_row_count} Invoices`,
      icon: Layers,
      color: 'text-[#4f748a]',
      border: 'border-[#dcd6cd]',
      bgGlow: 'bg-[#ffffff]',
      desc: 'Grand total rows processed from sheets'
    }
  ];

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className={`ledger-panel border ${m.border} ${m.bgGlow} p-5 relative overflow-hidden transition-all duration-200 hover:translate-y-[-1px]`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#73675c] tracking-wider uppercase block">{m.label}</span>
                <span className="text-2xl font-bold font-serif text-[#2c2520] block">{m.value}</span>
                {m.subValue && <span className="text-[10px] font-mono text-[#73675c] block mt-0.5">{m.subValue}</span>}
              </div>
              <div className={`p-2 bg-[#f7f4eb] border border-[#dcd6cd] rounded ${m.color}`}>
                <m.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-[9px] font-mono text-[#73675c] mt-4 border-t border-[#dcd6cd] pt-2">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Detailed Breakdowns & Progress Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Exception breakdown details */}
        <div className="ledger-panel border border-[#dcd6cd] rounded-lg p-5 md:col-span-2 bg-[#ffffff]">
          <h3 className="text-xs font-bold uppercase tracking-wider font-serif text-[#2c2520] mb-4 border-b border-[#dcd6cd] pb-2">Discrepancy Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#fcf9f7] p-4 border border-[#be5a38]/20 rounded">
              <span className="text-[10px] font-mono font-bold text-[#73675c]">Missing in PO</span>
              <span className="block text-xl font-bold font-mono text-[#be5a38] mt-1">{stats.missing_in_po}</span>
              <span className="text-[9px] text-[#73675c] block mt-1">Invoice line has no PO record</span>
            </div>
            <div className="bg-[#fdfbf7] p-4 border border-[#c2923f]/20 rounded">
              <span className="text-[10px] font-mono font-bold text-[#73675c]">Missing in Invoice</span>
              <span className="block text-xl font-bold font-mono text-[#c2923f] mt-1">{stats.missing_in_invoice}</span>
              <span className="text-[9px] text-[#73675c] block mt-1">PO line has no Invoice record</span>
            </div>
            <div className="bg-[#fcfbf9] p-4 border border-[#dcd6cd] rounded">
              <span className="text-[10px] font-mono font-bold text-[#73675c]">Value Mismatch</span>
              <span className="block text-xl font-bold font-mono text-[#2c2520] mt-1">{stats.value_mismatch}</span>
              <span className="text-[9px] text-[#73675c] block mt-1">Pricing or quantities differ</span>
            </div>
            <div className="bg-[#f7f4eb]/40 p-4 border border-[#dcd6cd] rounded">
              <span className="text-[10px] font-mono font-bold text-[#73675c]">Duplicates</span>
              <span className="block text-xl font-bold font-mono text-[#73675c] mt-1">{stats.duplicates}</span>
              <span className="text-[9px] text-[#73675c] block mt-1">Key repeated within file</span>
            </div>
          </div>
        </div>

        {/* Visual Progress Doughnut Ring (Vintage) */}
        <div className="ledger-panel border border-[#dcd6cd] rounded-lg p-5 flex flex-col justify-between bg-[#ffffff]">
          <h3 className="text-xs font-bold uppercase tracking-wider font-serif text-[#2c2520] mb-2 border-b border-[#dcd6cd] pb-2">Audit Accuracy</h3>
          <div className="flex items-center justify-center py-1">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-[#f7f4eb]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Matched Progress Ring */}
                <path
                  className="text-[#3c5946] transition-all duration-1000 ease-out"
                  strokeWidth="3.5"
                  strokeDasharray={`${matchedPercent}, 100`}
                  strokeLinecap="square"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Discrepancy Progress Ring */}
                {discrepancyPercent > 0 && (
                  <path
                    className="text-[#be5a38]"
                    strokeWidth="3.5"
                    strokeDasharray={`${discrepancyPercent}, 100`}
                    strokeDashoffset={`-${matchedPercent}`}
                    strokeLinecap="square"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-mono font-bold text-[#2c2520]">{matchedPercent}%</span>
                <span className="text-[8px] font-bold text-[#73675c] tracking-wider uppercase">Aligned</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3 text-[9px] font-mono mt-2 pt-3 border-t border-[#f7f4eb]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#3c5946] inline-block" /> Match</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#be5a38] inline-block" /> Excep</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#f7f4eb] border border-[#dcd6cd] inline-block" /> Gap</span>
          </div>
        </div>
      </div>
    </div>
  );
}
