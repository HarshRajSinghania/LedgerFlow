import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, ChevronRight, HelpCircle } from 'lucide-react';

export default function ExecutiveSummary({ summary, warnings }) {
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!summary) return;
    
    // Simulate a typing animation for the AI summary
    setTypedText('');
    setIsTyping(true);
    let index = 0;
    const speed = 7;
    
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
    if (!text) return '';
    
    let formatted = text;
    // Highlight dollar/pound amounts
    formatted = formatted.replace(/([$£]\d+(?:,\d{3})*(?:\.\d+)?)/g, '<strong class="text-[#be5a38] font-mono font-bold">$1</strong>');
    // Highlight percentage figures
    formatted = formatted.replace(/(\d+%\s*)/g, '<strong class="text-[#3c5946] font-mono font-bold">$1</strong>');
    // Highlight statuses
    formatted = formatted.replace(/(MATCHED|MISSING_IN_PO|MISSING_IN_INVOICE|VALUE_MISMATCH|DUPLICATE_KEY_[A-Z_]+)/g, '<span class="bg-[#f7f4eb] border border-[#dcd6cd] text-[9px] px-1.5 py-0.2 rounded font-mono text-[#2c2520] font-bold inline-block">$1</span>');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="leading-relaxed whitespace-pre-wrap font-serif text-[#2c2520] text-sm" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full animate-fade-in">
      {/* Executive Summary Card */}
      <div className="ledger-panel border border-[#dcd6cd] rounded-lg p-6 lg:col-span-2 relative bg-[#ffffff] overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-[#dcd6cd] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#be5a38]/5 border border-[#be5a38]/15 text-[#be5a38] rounded">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-serif text-[#2c2520]">Narrative Exception Ledger</h3>
          </div>
          <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#f7f4eb] border border-[#dcd6cd] text-[#be5a38]">
            AI EXCEPTION NARRATIVE
          </span>
        </div>

        <div className="text-slate-800 text-sm">
          {isTyping ? highlightFinancials(typedText) : highlightFinancials(summary)}
          {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-[#be5a38] animate-pulse" />}
        </div>
      </div>

      {/* Warnings & Data Integrity Card */}
      <div className="ledger-panel border border-[#dcd6cd] rounded-lg p-6 flex flex-col justify-between bg-[#ffffff]">
        <div>
          <div className="flex items-center gap-2 mb-4 border-b border-[#dcd6cd] pb-3">
            <div className={`p-1 border rounded ${warnings && warnings.length > 0 ? 'bg-[#c2923f]/5 border-[#c2923f]/25 text-[#c2923f]' : 'bg-[#3c5946]/5 border-[#3c5946]/25 text-[#3c5946]'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-serif text-[#2c2520]">Data Quality & Schema</h3>
          </div>

          {warnings && warnings.length > 0 ? (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {warnings.map((warn, i) => (
                <div key={i} className="flex gap-2 text-[10px] font-mono bg-[#fdfbf7] p-2.5 border border-[#dcd6cd] rounded text-[#73675c] leading-normal">
                  <ChevronRight className="w-3.5 h-3.5 text-[#c2923f] flex-shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-[#73675c]">
              <CheckCircleIcon className="w-7 h-7 text-[#3c5946]/35 mb-2" />
              <p className="text-xs font-bold font-serif text-[#2c2520]">Clean Ingestion Integrity</p>
              <p className="text-[9px] text-[#73675c] font-mono mt-1 max-w-[200px]">All entries ingested cleanly. No schemas or alias anomalies found in either file.</p>
            </div>
          )}
        </div>

        <div className="border-t border-[#f7f4eb] pt-3 mt-4 flex items-center justify-between text-[9px] font-mono text-[#73675c]">
          <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5 text-[#73675c]" /> Resilience alias active</span>
          <span>STABLE CORE</span>
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
