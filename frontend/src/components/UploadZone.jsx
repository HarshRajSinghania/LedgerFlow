import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, X, Check } from 'lucide-react';

export default function UploadZone({ onReconciliationComplete }) {
  const [poFile, setPoFile] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [dragPoActive, setDragPoActive] = useState(false);
  const [dragInvActive, setDragInvActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const poInputRef = useRef(null);
  const invInputRef = useRef(null);

  const handleDrag = (e, setDragActive) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e, setFile, setDragActive) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidExcel(file)) {
        setFile(file);
      } else {
        triggerError("Invalid file format. Please upload an Excel file (.xlsx or .xls)");
      }
    }
  };

  const handleFileChange = (e, setFile) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidExcel(file)) {
        setFile(file);
      } else {
        triggerError("Invalid file format. Please upload an Excel file (.xlsx or .xls)");
      }
    }
  };

  const isValidExcel = (file) => {
    const validExtensions = ['xlsx', 'xls'];
    const extension = file.name.split('.').pop().toLowerCase();
    const validMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return validExtensions.includes(extension) || validMimes.includes(file.type);
  };

  const triggerError = (msg) => {
    setError(true);
    setErrorMessage(msg);
    setTimeout(() => {
      setError(false);
      setErrorMessage('');
    }, 5000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!poFile || !invoiceFile) {
      triggerError("Please provide both Purchase Orders and Invoices files.");
      return;
    }

    setLoading(true);
    setError(false);

    const formData = new FormData();
    formData.append('po_file', poFile);
    formData.append('invoice_file', invoiceFile);

    try {
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Error status code: ${response.status}`);
      }

      const result = await response.json();
      onReconciliationComplete(result);
    } catch (err) {
      console.error(err);
      triggerError(err.message || 'An unexpected error occurred during reconciliation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-2.5 bg-violet-600/10 rounded-2xl border border-violet-500/20 mb-4">
          <UploadCloud className="w-8 h-8 text-violet-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
          LedgerFlow Reconciliation
        </h1>
        <p className="text-slate-400 mt-2 max-w-xl mx-auto text-base">
          Upload your Purchase Orders and Invoices to automatically align line items, flag pricing discrepancies, and surface financial exposures with AI-narrated summaries.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Purchase Orders Upload Box */}
          <div
            className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-300 glass-panel ${
              dragPoActive
                ? 'border-violet-500 bg-violet-950/20 scale-[1.01]'
                : poFile
                ? 'border-emerald-500/40 bg-emerald-950/5'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
            }`}
            onDragEnter={(e) => handleDrag(e, setDragPoActive)}
            onDragOver={(e) => handleDrag(e, setDragPoActive)}
            onDragLeave={(e) => handleDrag(e, setDragPoActive)}
            onDrop={(e) => handleDrop(e, setPoFile, setDragPoActive)}
          >
            <input
              ref={poInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => handleFileChange(e, setPoFile)}
              className="hidden"
            />

            {poFile ? (
              <div className="flex flex-col items-center text-center space-y-4 w-full">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="w-full px-2">
                  <p className="text-slate-200 font-medium truncate max-w-xs mx-auto">{poFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatFileSize(poFile.size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" /> Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => { setPoFile(null); if(poInputRef.current) poInputRef.current.value = ''; }}
                    className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center cursor-pointer w-full" onClick={() => poInputRef.current?.click()}>
                <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-4 hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <p className="text-slate-200 font-semibold text-sm">Upload Purchase Orders</p>
                <p className="text-slate-500 text-xs mt-1">Drag and drop or click to browse</p>
                <span className="text-[10px] text-slate-600 bg-slate-950 px-2 py-0.5 mt-4 rounded-md border border-slate-800">Excel format (.xlsx)</span>
              </div>
            )}
          </div>

          {/* Invoices Upload Box */}
          <div
            className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-300 glass-panel ${
              dragInvActive
                ? 'border-violet-500 bg-violet-950/20 scale-[1.01]'
                : invoiceFile
                ? 'border-emerald-500/40 bg-emerald-950/5'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
            }`}
            onDragEnter={(e) => handleDrag(e, setDragInvActive)}
            onDragOver={(e) => handleDrag(e, setDragInvActive)}
            onDragLeave={(e) => handleDrag(e, setDragInvActive)}
            onDrop={(e) => handleDrop(e, setInvoiceFile, setDragInvActive)}
          >
            <input
              ref={invInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => handleFileChange(e, setInvoiceFile)}
              className="hidden"
            />

            {invoiceFile ? (
              <div className="flex flex-col items-center text-center space-y-4 w-full">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="w-full px-2">
                  <p className="text-slate-200 font-medium truncate max-w-xs mx-auto">{invoiceFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatFileSize(invoiceFile.size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" /> Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => { setInvoiceFile(null); if(invInputRef.current) invInputRef.current.value = ''; }}
                    className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center cursor-pointer w-full" onClick={() => invInputRef.current?.click()}>
                <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-4 hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <p className="text-slate-200 font-semibold text-sm">Upload Invoices</p>
                <p className="text-slate-500 text-xs mt-1">Drag and drop or click to browse</p>
                <span className="text-[10px] text-slate-600 bg-slate-950 px-2 py-0.5 mt-4 rounded-md border border-slate-800">Excel format (.xlsx)</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={!poFile || !invoiceFile || loading}
            className={`relative flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold shadow-lg text-white transition-all duration-300 ${
              !poFile || !invoiceFile
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 border border-slate-700/50'
                : loading
                ? 'bg-violet-950 text-violet-300 border border-violet-800/40 cursor-wait'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98] border border-violet-500/20 shadow-violet-950/20 shadow-[0_4px_20px_0_rgba(124,58,237,0.25)]'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Reconciling Ledger entries...</span>
              </>
            ) : (
              <>
                <span>Run Ledger Reconciliation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
