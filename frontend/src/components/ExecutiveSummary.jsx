import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, ChevronRight, HelpCircle } from 'lucide-react';

export default function ExecutiveSummary({ summary, warnings }) {
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!summary) return;
    
    // Simulate a typing animation for the AI summary to make it feel "live" and engaging
    setTypedText('');
    setIsTyping(true);
    let index = 0;
    const speed = 8; // ms per character
    
    const interval = setInterval(() => {
      setTypedText((prev) => prev + summary.charAt(index));
      index++;
      if (index >= summary.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [summary]);

  const highlightFinancials = (text) => {
    // Format text to highlight currency symbols and figures, statuses, and counts
    if (!text) return '';
    
    // Simple regex replacements to wrap specific targets in tags
    let formatted = text;
    // Highlight dollar amounts (e.g. $1,234.56 or £12,000.00)
    formatted = formatted.replace(/([$£]\d+(?:,\d{3})*(?:\.\d+)?)/g, '<strong class="text-violet-400 font-semibold">$1</strong>');
    // Highlight percentage figures
    formatted = formatted.replace(/(\d+%\s*)/g, '<strong class="text-emerald-400 font-semibold">$1</strong>');
    // Highlight statuses
    formatted = formatted.replace(/(MATCHED|MISSING_IN_PO|MISSING_IN_INVOICE|VALUE_MISMATCH|DUPLICATE_KEY_[A-Z_]+)/g, '<span class="bg-slate-900 border border-slate-800 text-xs px-2 py-0.5 rounded text-slate-300 font-mono inline-block">$1</span>');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="leading-relaxed whitespace-pre-wrap" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full animate-fade-in">
      {/* Executive Summary Card */}
      <div className="glass-panel border border-violet-500/10 rounded-2xl p-6 lg:col-span-2 relative overflow-hidden">
        {/* Glow behind Sparkles */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-violet-600/5 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/40 pb-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">AI Narrative Exception Report</h3>
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
            NVIDIA NIM Generated
          </span>
        </div>

        <div className="text-slate-300 text-sm relative z-10">
          {isTyping ? highlightFinancials(typedText) : highlightFinancials(summary)}
          {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-violet-400 animate-pulse" />}
        </div>
      </div>

      {/* Warnings & Data Integrity Card */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800/40 pb-3">
            <div className={`p-1.5 rounded-lg ${warnings && warnings.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Data Quality & Warnings</h3>
          </div>

          {warnings && warnings.length > 0 ? (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {warnings.map((warn, i) => (
                <div key={i} className="flex gap-2 text-xs bg-slate-950/40 p-2.5 border border-slate-900 rounded-xl text-slate-400 leading-normal">
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500/40 mb-2" />
              <p className="text-xs font-medium text-slate-300">Clean File Parse</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">All rows parsed cleanly. No schema, alias mapping, or unparseable value exceptions skipped.</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800/40 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3 text-slate-600" /> Auto-header mapping active</span>
          <span>Resilient ingestion mode</span>
        </div>
      </div>
    </div>
  );
}

// Inline fallback checkmark icon helper
function CheckCircleIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
