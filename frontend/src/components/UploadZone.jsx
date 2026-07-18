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
        <div className="inline-flex items-center justify-center p-3 bg-[#be5a38]/5 border border-[#be5a38]/20 rounded-full mb-4">
          <UploadCloud className="w-7 h-7 text-[#be5a38]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#2c2520]">
          LedgerFlow Ingestion
        </h1>
        <p className="text-[#73675c] mt-2 max-w-xl mx-auto text-sm font-sans leading-relaxed">
          Align purchase ledgers, flag pricing discrepancies, and extract financial exposure reports. Upload Purchase Orders and Invoices in Excel spreadsheet formats.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-[#fcf8f2] border border-[#be5a38]/30 rounded text-[#be5a38] text-sm animate-fade-in font-mono">
          <AlertCircle className="w-4 h-4 text-[#be5a38] flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Purchase Orders Upload Box */}
          <div
            className={`relative flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-all duration-300 ledger-panel cursor-pointer ${
              dragPoActive
                ? 'border-[#be5a38] bg-[#f8f6f0] scale-[1.01]'
                : poFile
                ? 'border-[#3c5946]/45 bg-[#fcfdfc]'
                : 'border-[#dcd6cd] hover:border-[#be5a38]/55 bg-[#ffffff]'
            }`}
            onDragEnter={(e) => handleDrag(e, setDragPoActive)}
            onDragOver={(e) => handleDrag(e, setDragPoActive)}
            onDragLeave={(e) => handleDrag(e, setDragPoActive)}
            onDrop={(e) => handleDrop(e, setPoFile, setDragPoActive)}
            onClick={() => !poFile && poInputRef.current?.click()}
          >
            <input
              ref={poInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => handleFileChange(e, setPoFile)}
              className="hidden"
            />

            {poFile ? (
              <div className="flex flex-col items-center text-center space-y-4 w-full" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-12 bg-[#3c5946]/5 border border-[#3c5946]/15 rounded flex items-center justify-center text-[#3c5946]">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="w-full px-2">
                  <p className="text-[#2c2520] font-bold text-sm truncate max-w-xs mx-auto font-serif">{poFile.name}</p>
                  <p className="text-[10px] text-[#73675c] font-mono mt-1">{formatFileSize(poFile.size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-[#e6ede7] text-[#3c5946] border border-[#3c5946]/20 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3" /> READY
                  </span>
                  <button
                    type="button"
                    onClick={() => { setPoFile(null); if(poInputRef.current) poInputRef.current.value = ''; }}
                    className="p-1 text-[#73675c] hover:text-[#be5a38] rounded border border-transparent hover:border-[#dcd6cd] transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center w-full">
                <div className="w-12 h-12 bg-[#f7f4eb] border border-[#dcd6cd] rounded flex items-center justify-center text-[#73675c] mb-4 hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <p className="text-[#2c2520] font-bold text-sm font-serif">Purchase Order Sheet</p>
                <p className="text-[#73675c] text-xs mt-1">Drag and drop file here, or click to browse</p>
                <span className="text-[9px] font-mono text-[#73675c] bg-[#f7f4eb] px-2 py-0.5 mt-4 border border-[#dcd6cd]">EXCEL FORMAT (.XLSX)</span>
              </div>
            )}
          </div>

          {/* Invoices Upload Box */}
          <div
            className={`relative flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-all duration-300 ledger-panel cursor-pointer ${
              dragInvActive
                ? 'border-[#be5a38] bg-[#f8f6f0] scale-[1.01]'
                : invoiceFile
                ? 'border-[#3c5946]/45 bg-[#fcfdfc]'
                : 'border-[#dcd6cd] hover:border-[#be5a38]/55 bg-[#ffffff]'
            }`}
            onDragEnter={(e) => handleDrag(e, setDragInvActive)}
            onDragOver={(e) => handleDrag(e, setDragInvActive)}
            onDragLeave={(e) => handleDrag(e, setDragInvActive)}
            onDrop={(e) => handleDrop(e, setInvoiceFile, setDragInvActive)}
            onClick={() => !invoiceFile && invInputRef.current?.click()}
          >
            <input
              ref={invInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => handleFileChange(e, setInvoiceFile)}
              className="hidden"
            />

            {invoiceFile ? (
              <div className="flex flex-col items-center text-center space-y-4 w-full" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-12 bg-[#3c5946]/5 border border-[#3c5946]/15 rounded flex items-center justify-center text-[#3c5946]">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="w-full px-2">
                  <p className="text-[#2c2520] font-bold text-sm truncate max-w-xs mx-auto font-serif">{invoiceFile.name}</p>
                  <p className="text-[10px] text-[#73675c] font-mono mt-1">{formatFileSize(invoiceFile.size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-[#e6ede7] text-[#3c5946] border border-[#3c5946]/20 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3" /> READY
                  </span>
                  <button
                    type="button"
                    onClick={() => { setInvoiceFile(null); if(invInputRef.current) invInputRef.current.value = ''; }}
                    className="p-1 text-[#73675c] hover:text-[#be5a38] rounded border border-transparent hover:border-[#dcd6cd] transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center w-full">
                <div className="w-12 h-12 bg-[#f7f4eb] border border-[#dcd6cd] rounded flex items-center justify-center text-[#73675c] mb-4 hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <p className="text-[#2c2520] font-bold text-sm font-serif">Invoice Ledger Sheet</p>
                <p className="text-[#73675c] text-xs mt-1">Drag and drop file here, or click to browse</p>
                <span className="text-[9px] font-mono text-[#73675c] bg-[#f7f4eb] px-2 py-0.5 mt-4 border border-[#dcd6cd]">EXCEL FORMAT (.XLSX)</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={!poFile || !invoiceFile || loading}
            className={`relative flex items-center justify-center gap-2 px-8 py-3 rounded font-mono font-bold uppercase tracking-wider text-xs border shadow transition-all duration-200 ${
              !poFile || !invoiceFile
                ? 'bg-[#eae3d2] text-[#b8ad9e] border-[#dcd6cd] cursor-not-allowed'
                : loading
                ? 'bg-[#ffffff] text-[#be5a38] border-[#be5a38] cursor-wait'
                : 'bg-[#be5a38] hover:bg-[#a64c2e] text-[#ffffff] border-[#be5a38] shadow-[2px_2px_0px_rgba(44,37,32,0.15)] hover:translate-y-[-1px] active:translate-y-[1px]'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-[#be5a38]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Reconciling Ledger entries...</span>
              </>
            ) : (
              <>
                <span>Run Ingestion & Reconciliation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
