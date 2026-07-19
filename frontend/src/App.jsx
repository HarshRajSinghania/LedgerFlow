import React, { useState, useEffect } from 'react';
import { Layers, Activity, Server, AlertCircle, UploadCloud, History, Sparkles, BookOpen, Code2 } from 'lucide-react';
import UploadZone from './components/UploadZone';
import StatsGrid from './components/StatsGrid';
import ExecutiveSummary from './components/ExecutiveSummary';
import ReconciliationChart from './components/ReconciliationChart';
import ReconciliationTable from './components/ReconciliationTable';
import HistorySidebar from './components/HistorySidebar';
import AskAIPanel from './components/AskAIPanel';

const REPO_URL = 'https://github.com/HarshRajSinghania/LedgerFlow';

export default function App() {
  const [activeJob, setActiveJob] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [apiOnline, setApiOnline] = useState(null);
  const [askOpen, setAskOpen] = useState(false);
  const historyRef = React.useRef(null);

  // Check backend health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok') {
            setApiOnline(true);
            return;
          }
        }
        setApiOnline(false);
      } catch {
        setApiOnline(false);
      }
    }
    checkHealth();
  }, []);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('ledgerflow_jobs_v1');
    if (saved) {
      try {
        setHistoryList(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }
  }, []);

  const handleReconciliationComplete = (result) => {
    const newJob = {
      job_id: result.job_id,
      timestamp: new Date().toISOString(),
      po_name: result.po_name || 'PurchaseOrders.xlsx',
      invoice_name: result.invoice_name || 'Invoices.xlsx',
      stats: result.stats,
      summary: result.summary,
      warnings: result.warnings,
      report: result.report,
      download_url: result.download_url
    };

    const updatedHistory = [newJob, ...historyList.filter(j => j.job_id !== result.job_id)].slice(0, 5);
    setHistoryList(updatedHistory);
    localStorage.setItem('ledgerflow_jobs_v1', JSON.stringify(updatedHistory));
    setActiveJob(newJob);
  };

  const handleSelectJob = (job) => {
    setActiveJob(job);
  };

  const handleDeleteJob = (jobId) => {
    const updated = historyList.filter((j) => j.job_id !== jobId);
    setHistoryList(updated);
    localStorage.setItem('ledgerflow_jobs_v1', JSON.stringify(updated));
    if (activeJob && activeJob.job_id === jobId) {
      setActiveJob(null);
    }
  };

  const handleBackToUpload = () => {
    setActiveJob(null);
  };

  const handleRowAction = (updatedRow) => {
    if (!activeJob) return;
    const newReport = activeJob.report.map((r) =>
      r.Invoice_ID === updatedRow.Invoice_ID && r.Product_Code === updatedRow.Product_Code ? updatedRow : r
    );
    const updatedJob = { ...activeJob, report: newReport };
    setActiveJob(updatedJob);
    const updatedHistory = historyList.map((j) => (j.job_id === updatedJob.job_id ? updatedJob : j));
    setHistoryList(updatedHistory);
    localStorage.setItem('ledgerflow_jobs_v1', JSON.stringify(updatedHistory));
  };

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navbar (Minimal Vintage Style) */}
      <header className="border-b border-[#dcd6cd] bg-[#ffffff] sticky top-0 z-50 px-6 py-4 shadow-[0_1px_3px_rgba(44,37,32,0.03)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveJob(null)}>
            <div className="w-8.5 h-8.5 bg-[#be5a38] rounded flex items-center justify-center text-white shadow-sm">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-serif font-bold text-lg tracking-tight text-[#2c2520] block leading-none">
                LedgerFlow
              </span>
              <span className="text-[9px] font-mono text-[#73675c] font-bold block uppercase tracking-wider mt-1 leading-none">RECONCILIATION ENGINE</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveJob(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                !activeJob ? 'bg-[#f7f4eb] text-[#be5a38]' : 'text-[#73675c] hover:text-[#2c2520] hover:bg-[#f7f4eb]'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" /> New Run
            </button>
            <button
              onClick={scrollToHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-[#73675c] hover:text-[#2c2520] hover:bg-[#f7f4eb] transition-all"
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
            <button
              onClick={() => setAskOpen(true)}
              disabled={!activeJob}
              title={activeJob ? 'Ask AI about this reconciliation' : 'Run a reconciliation first'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-[#73675c] hover:text-[#be5a38] hover:bg-[#f7f4eb] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <Sparkles className="w-3.5 h-3.5" /> Ask AI
            </button>
            <a
              href={`${REPO_URL}#readme`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-[#73675c] hover:text-[#2c2520] hover:bg-[#f7f4eb] transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" /> Docs
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-[#73675c] hover:text-[#2c2520] hover:bg-[#f7f4eb] transition-all"
            >
              <Code2 className="w-3.5 h-3.5" /> GitHub
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {/* API Health badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-[#f8f6f0] border border-[#dcd6cd] rounded text-[9px] font-mono font-bold text-[#73675c] uppercase">
              <Server className="w-3.5 h-3.5 text-[#73675c]" />
              <span>Core:</span>
              {apiOnline === null ? (
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse inline-block" /> Checking</span>
              ) : apiOnline ? (
                <span className="flex items-center gap-1 text-[#3c5946]"><span className="w-1.5 h-1.5 rounded-full bg-[#3c5946] inline-block" /> Online</span>
              ) : (
                <span className="flex items-center gap-1 text-[#be5a38]"><span className="w-1.5 h-1.5 rounded-full bg-[#be5a38] inline-block" /> Offline</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main App Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        {!activeJob ? (
          /* Landing Screen (Upload & History) */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <div className="lg:col-span-3">
              <UploadZone
                onReconciliationComplete={handleReconciliationComplete}
              />
            </div>
            
            <div ref={historyRef} className="lg:col-span-1 h-full lg:sticky lg:top-24">
              <HistorySidebar
                historyList={historyList}
                onSelectJob={handleSelectJob}
                onDeleteJob={handleDeleteJob}
                activeJobId={null}
              />
            </div>
          </div>
        ) : (
          /* Dashboard Screen */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Dashboard Content */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between border-b border-[#dcd6cd] pb-4">
                <div>
                  <h1 className="text-2xl font-bold font-serif text-[#2c2520]">
                    Reconciliation Dashboard
                  </h1>
                  <p className="text-[11px] font-mono text-[#73675c] uppercase mt-0.5">
                    Analyzing ledger discrepancies for <strong className="text-[#be5a38]">{activeJob.po_name}</strong> vs <strong className="text-[#4f748a]">{activeJob.invoice_name}</strong>
                  </p>
                </div>
              </div>

              {/* Stats Cards Row */}
              <StatsGrid stats={activeJob.stats} />

              {/* AI Narrative & Integrity Cards */}
              <ExecutiveSummary
                summary={activeJob.summary}
                warnings={activeJob.warnings}
              />

              {/* Recharts Visualizations (New Graph component) */}
              <ReconciliationChart
                report={activeJob.report}
                stats={activeJob.stats}
              />

              {/* Report Table Sheet */}
              <ReconciliationTable
                report={activeJob.report}
                jobId={activeJob.job_id}
                onBackToUpload={handleBackToUpload}
                onRowAction={handleRowAction}
              />
            </div>

            {/* Sticky Sidebar on the right */}
            <div ref={historyRef} className="lg:col-span-1 h-full lg:sticky lg:top-24">
              <HistorySidebar
                historyList={historyList}
                onSelectJob={handleSelectJob}
                onDeleteJob={handleDeleteJob}
                activeJobId={activeJob.job_id}
              />
            </div>
          </div>
        )}
      </main>

      {askOpen && activeJob && (
        <AskAIPanel jobId={activeJob.job_id} onClose={() => setAskOpen(false)} />
      )}

      {/* Footer */}
      <footer className="border-t border-[#dcd6cd] bg-[#ffffff] py-5 text-center text-[9px] font-mono text-[#73675c] shadow-[0_-1px_3px_rgba(44,37,32,0.02)]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 LEDGERFLOW. AUDIT CORE MV-1. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#2c2520] transition-colors">PRIVACY POLICY</a>
            <a href="#" className="hover:text-[#2c2520] transition-colors">TERMS</a>
            <a href="#" className="hover:text-[#2c2520] transition-colors">API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
