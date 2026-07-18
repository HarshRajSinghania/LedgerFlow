import React, { useState, useEffect } from 'react';
import { Layers, Activity, Server, AlertCircle } from 'lucide-react';
import UploadZone from './components/UploadZone';
import StatsGrid from './components/StatsGrid';
import ExecutiveSummary from './components/ExecutiveSummary';
import ReconciliationTable from './components/ReconciliationTable';
import HistorySidebar from './components/HistorySidebar';

export default function App() {
  const [activeJob, setActiveJob] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [apiOnline, setApiOnline] = useState(null);

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
    // Collect mock or actual file names from input elements if needed,
    // otherwise we can read them from upload state, or just extract them.
    // In this case, let's look at the result job_id.
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

    // Update history, keeping the last 5 jobs to avoid localStorage quota issues
    const updatedHistory = [newJob, ...historyList.filter(j => j.job_id !== result.job_id)].slice(0, 5);
    setHistoryList(updatedHistory);
    localStorage.setItem('ledgerflow_jobs_v1', JSON.stringify(updatedHistory));
    
    // Set as active job
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

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/60 bg-slate-950/45 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveJob(null)}>
            <div className="w-9 h-9 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_-3px_rgba(124,58,237,0.4)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                LedgerFlow
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider leading-none">reconciliation engine</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* API Health badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-semibold text-slate-400">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>Backend Core:</span>
              {apiOnline === null ? (
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse inline-block" /> Checking</span>
              ) : apiOnline ? (
                <span className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online</span>
              ) : (
                <span className="flex items-center gap-1 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Offline</span>
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
            
            <div className="lg:col-span-1 h-full lg:sticky lg:top-24">
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
            <div className="lg:col-span-3 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-800/40 pb-4">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
                    Reconciliation Dashboard
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Analyzing ledger discrepancies for <strong className="text-indigo-400">{activeJob.po_name}</strong> vs <strong className="text-violet-400">{activeJob.invoice_name}</strong>
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

              {/* Report Table Sheet */}
              <ReconciliationTable
                report={activeJob.report}
                jobId={activeJob.job_id}
                onBackToUpload={handleBackToUpload}
              />
            </div>

            {/* Sticky Sidebar on the right */}
            <div className="lg:col-span-1 h-full lg:sticky lg:top-24">
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

      {/* Footer */}
      <footer className="border-t border-slate-800/40 bg-slate-950/20 py-5 text-center text-[10px] text-slate-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 LedgerFlow. Built for the Hackathon. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-400 transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
