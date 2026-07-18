import React from 'react';
import { History, FileSpreadsheet, Trash2, ChevronRight, DollarSign, Calendar } from 'lucide-react';

export default function HistorySidebar({ historyList, onSelectJob, onDeleteJob, activeJobId }) {
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-panel border border-slate-800 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
        <History className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-slate-200">Reconciliation History</h3>
      </div>

      {historyList && historyList.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px] lg:max-h-[500px]">
          {historyList.map((job) => {
            const isActive = activeJobId === job.job_id;
            const exposure = job.stats?.total_exposure || 0;
            const matchRate = job.stats ? Math.round((job.stats.matched / job.stats.total_lines) * 100) : 0;
            
            return (
              <div
                key={job.job_id}
                onClick={() => onSelectJob(job)}
                className={`group relative p-3 border.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-violet-600/10 border-violet-500/35 text-slate-200 shadow-sm'
                    : 'bg-slate-950/40 border-slate-900 hover:border-slate-800/80 hover:bg-slate-900/20 text-slate-300'
                }`}
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteJob(job.job_id);
                  }}
                  className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 rounded-lg hover:bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* File names and Date */}
                <div className="pr-6">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="truncate max-w-[130px]">{job.po_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{formatDate(job.timestamp)}</span>
                  </div>
                </div>

                {/* Metrics footer */}
                <div className="flex items-center justify-between border-t border-slate-900/60 pt-2 mt-2 text-[10px]">
                  <span className="flex items-center gap-0.5 text-slate-400">
                    Accuracy: <strong className="text-emerald-400">{matchRate}%</strong>
                  </span>
                  
                  <span className="flex items-center gap-0.5 text-slate-400">
                    Exposure: <strong className={exposure > 0 ? 'text-red-400' : 'text-slate-400'}>{formatCurrency(exposure)}</strong>
                  </span>
                </div>

                {/* Chevron icon indicator */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-600 group-hover:text-slate-400 pointer-events-none transition-transform group-hover:translate-x-0.5">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 border border-dashed border-slate-900 rounded-xl">
          <History className="w-8 h-8 text-slate-800 mb-2" />
          <p className="text-xs font-semibold text-slate-400">No previous runs</p>
          <p className="text-[10px] text-slate-600 mt-1 max-w-[150px]">Upload POs and Invoices to populate your local reconciliation log.</p>
        </div>
      )}
    </div>
  );
}
