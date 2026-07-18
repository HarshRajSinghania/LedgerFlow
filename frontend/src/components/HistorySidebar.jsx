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
    <div className="ledger-panel border border-[#dcd6cd] rounded-lg p-5 bg-[#ffffff] h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-[#dcd6cd] pb-3.5 mb-4">
        <History className="w-4 h-4 text-[#be5a38]" />
        <h3 className="text-xs font-bold uppercase tracking-wider font-serif text-[#2c2520]">Reconciliation Log</h3>
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
                className={`group relative p-3 border.5 rounded cursor-pointer transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-[#f7f4eb] border-[#be5a38]/40 text-[#2c2520]'
                    : 'bg-[#ffffff] border-[#dcd6cd] hover:border-[#be5a38]/30 hover:bg-[#fcfbf9] text-[#73675c]'
                }`}
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteJob(job.job_id);
                  }}
                  className="absolute top-2.5 right-2.5 p-1 text-[#73675c] hover:text-[#be5a38] rounded hover:bg-[#f7f4eb] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* File names and Date */}
                <div className="pr-6">
                  <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#2c2520]">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#4f748a] flex-shrink-0" />
                    <span className="truncate max-w-[130px]">{job.po_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#73675c] mt-0.5">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{formatDate(job.timestamp)}</span>
                  </div>
                </div>

                {/* Metrics footer */}
                <div className="flex items-center justify-between border-t border-[#f7f4eb] pt-2 mt-2 text-[9px] font-mono">
                  <span className="text-[#73675c]">
                    Accuracy: <strong className="text-[#3c5946]">{matchRate}%</strong>
                  </span>
                  
                  <span className="text-[#73675c]">
                    Exposure: <strong className={exposure > 0 ? 'text-[#be5a38]' : 'text-[#73675c]'}>{formatCurrency(exposure)}</strong>
                  </span>
                </div>

                {/* Chevron icon indicator */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#73675c] group-hover:text-[#2c2520] pointer-events-none transition-transform group-hover:translate-x-0.5">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#73675c] border border-dashed border-[#dcd6cd] rounded">
          <History className="w-6 h-6 text-[#b8ad9e] mb-2" />
          <p className="text-xs font-serif font-bold text-[#2c2520]">No ledger history</p>
          <p className="text-[9px] font-mono text-[#73675c] mt-1 max-w-[150px]">Reconciliation reports will be archived here locally.</p>
        </div>
      )}
    </div>
  );
}
