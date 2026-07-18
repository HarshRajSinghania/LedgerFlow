import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Download, ArrowUpDown, Brain, Info, X, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

export default function ReconciliationTable({ report, jobId, onBackToUpload }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRow, setSelectedRow] = useState(null);
  const [sortField, setSortField] = useState('Financial_Exposure');
  const [sortAsc, setSortAsc] = useState(false);

  // Status Badge configurations
  const statusConfig = {
    MATCHED: {
      label: 'Matched',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400'
    },
    MISSING_IN_PO: {
      label: 'Missing in PO',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dot: 'bg-rose-500'
    },
    MISSING_IN_INVOICE: {
      label: 'Missing in Invoice',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500'
    },
    VALUE_MISMATCH: {
      label: 'Value Mismatch',
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
      dot: 'bg-red-500'
    },
    DUPLICATE_KEY_IN_PO: {
      label: 'PO Duplicate',
      color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
      dot: 'bg-fuchsia-400'
    },
    DUPLICATE_KEY_IN_INVOICE: {
      label: 'Invoice Duplicate',
      color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      dot: 'bg-pink-400'
    }
  };

  const getStatusDetails = (status) => {
    return statusConfig[status] || {
      label: status,
      color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      dot: 'bg-slate-400'
    };
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val);
  };

  const formatValue = (val) => {
    if (val === undefined || val === null) return '-';
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Get status options with counts for filter tabs
  const filterTabs = useMemo(() => {
    const counts = { ALL: report.length };
    report.forEach(row => {
      counts[row.Status] = (counts[row.Status] || 0) + 1;
    });

    return [
      { id: 'ALL', label: 'All Records', count: counts.ALL },
      { id: 'MISSING_IN_PO', label: 'Missing PO', count: counts.MISSING_IN_PO || 0 },
      { id: 'VALUE_MISMATCH', label: 'Value Mismatch', count: counts.VALUE_MISMATCH || 0 },
      { id: 'MISSING_IN_INVOICE', label: 'Missing Invoice', count: counts.MISSING_IN_INVOICE || 0 },
      { id: 'DUPLICATES', label: 'Duplicates', count: (counts.DUPLICATE_KEY_IN_PO || 0) + (counts.DUPLICATE_KEY_IN_INVOICE || 0) },
      { id: 'MATCHED', label: 'Matched', count: counts.MATCHED || 0 },
    ];
  }, [report]);

  // Filtering & Sorting report data
  const filteredReport = useMemo(() => {
    let result = [...report];

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'DUPLICATES') {
        result = result.filter(row => row.Status === 'DUPLICATE_KEY_IN_PO' || row.Status === 'DUPLICATE_KEY_IN_INVOICE');
      } else {
        result = result.filter(row => row.Status === statusFilter);
      }
    }

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => 
        (row.Invoice_ID && row.Invoice_ID.toLowerCase().includes(term)) ||
        (row.Product_Code && row.Product_Code.toLowerCase().includes(term)) ||
        (row.Product_Name && row.Product_Name.toLowerCase().includes(term)) ||
        (row.Supplier && row.Supplier.toLowerCase().includes(term))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nulls in sorting
      if (valA === null || valA === undefined) return sortAsc ? -1 : 1;
      if (valB === null || valB === undefined) return sortAsc ? 1 : -1;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [report, statusFilter, searchTerm, sortField, sortAsc]);

  const handleDownload = () => {
    window.open(`/api/reconcile/${jobId}/download`, '_blank');
  };

  return (
    <div className="relative w-full animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Reconciliation Ledger Sheet
            <span className="text-xs font-normal text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
              {report.length} lines parsed
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Click any row to inspect side-by-side details, discrepancy values, and AI notes.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToUpload}
            className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-xs font-semibold rounded-xl transition-all"
          >
            Upload New Files
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all shadow-violet-950/20"
          >
            <Download className="w-3.5 h-3.5" /> Download Excel Report
          </button>
        </div>
      </div>

      {/* Filters & Search bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ID, product, supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-violet-600/10 text-violet-400 border-violet-500/30 shadow-sm'
                  : 'bg-slate-900/30 text-slate-400 border-slate-900 hover:border-slate-800 hover:text-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 bg-slate-950/80 rounded border font-mono ${
                statusFilter === tab.id ? 'border-violet-500/20 text-violet-300' : 'border-slate-800 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Table container */}
        <div className="lg:col-span-2 glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/40 text-slate-400 font-semibold tracking-wider">
                  <th className="p-4 cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => handleSort('Status')}>
                    <div className="flex items-center gap-1.5">
                      Status <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => handleSort('Invoice_ID')}>
                    <div className="flex items-center gap-1.5">
                      Invoice ID / PO <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => handleSort('Product_Name')}>
                    <div className="flex items-center gap-1.5">
                      Product <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => handleSort('Financial_Exposure')}>
                    <div className="flex items-center gap-1.5 justify-end">
                      Exposure <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredReport.length > 0 ? (
                  filteredReport.map((row, idx) => {
                    const statusInfo = getStatusDetails(row.Status);
                    const isSelected = selectedRow && selectedRow.Invoice_ID === row.Invoice_ID && selectedRow.Product_Code === row.Product_Code;
                    
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRow(row)}
                        className={`cursor-pointer transition-colors hover:bg-slate-900/30 ${
                          isSelected ? 'table-row-selected bg-violet-600/5' : ''
                        }`}
                      >
                        {/* Status badge */}
                        <td className="p-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${statusInfo.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            {statusInfo.label}
                          </span>
                        </td>
                        
                        {/* IDs */}
                        <td className="p-4 font-mono font-semibold text-slate-200">
                          {row.Invoice_ID}
                          {row.Product_Code && <span className="block text-[10px] text-slate-500 font-normal mt-0.5">{row.Product_Code}</span>}
                        </td>
                        
                        {/* Product / Supplier */}
                        <td className="p-4 max-w-[200px]">
                          <span className="font-medium text-slate-200 block truncate">{row.Product_Name || 'n/a'}</span>
                          <span className="text-[10px] text-slate-500 block truncate mt-0.5">{row.Supplier || 'n/a'}</span>
                        </td>
                        
                        {/* Financial Exposure */}
                        <td className="p-4 text-right font-mono font-semibold">
                          {row.Financial_Exposure > 0 ? (
                            <span className="text-red-400">{formatCurrency(row.Financial_Exposure)}</span>
                          ) : (
                            <span className="text-slate-500">{formatCurrency(row.Financial_Exposure)}</span>
                          )}
                        </td>

                        {/* Expand Icon */}
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            className={`p-1 rounded-lg transition-colors ${
                              isSelected ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">
                      No records matched the filter criteria or search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Side Panel (Selected Row details) */}
        <div className="lg:col-span-1">
          {selectedRow ? (
            <div className="glass-panel border border-violet-500/20 rounded-2xl p-5 shadow-xl relative animate-fade-in">
              <button
                onClick={() => setSelectedRow(null)}
                className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Audit inspector</span>
              
              {/* Product and Supplier headers */}
              <div className="mt-2 mb-4">
                <h3 className="text-base font-bold text-slate-200">{selectedRow.Product_Name || 'Product Code: ' + selectedRow.Product_Code}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedRow.Supplier || 'Unknown Supplier'}</p>
                <span className="text-[10px] text-slate-500 font-mono block mt-1">Invoice ID: {selectedRow.Invoice_ID} • Code: {selectedRow.Product_Code}</span>
              </div>

              {/* Status Indicator */}
              <div className="mb-4">
                <div className={`flex items-center gap-2 p-3 border rounded-xl bg-slate-950/60 ${getStatusDetails(selectedRow.Status).color}`}>
                  <span className={`w-2 h-2 rounded-full ${getStatusDetails(selectedRow.Status).dot}`} />
                  <span className="text-xs font-bold uppercase">{getStatusDetails(selectedRow.Status).label}</span>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="space-y-3 mb-5">
                <h4 className="text-xs font-semibold text-slate-400 border-b border-slate-800 pb-1.5">Line Comparison</h4>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {/* Purchase Order Details */}
                  <div className="bg-slate-950/40 p-3 border border-slate-900/60 rounded-xl space-y-2">
                    <span className="font-semibold text-slate-400 block border-b border-slate-800 pb-1 text-[10px] tracking-wide uppercase">Purchase Order</span>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Date</span>
                      <span className="text-slate-300 font-medium">{selectedRow.PO_Date || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Quantity</span>
                      <span className="text-slate-300 font-semibold font-mono">{formatValue(selectedRow.PO_Quantity)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Unit Price</span>
                      <span className="text-slate-300 font-semibold font-mono">{formatCurrency(selectedRow.PO_Unit_Price)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-800/40">
                      <span className="text-slate-500 block text-[9px]">Total</span>
                      <span className="text-slate-200 font-bold font-mono">{formatCurrency(selectedRow.PO_Total)}</span>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="bg-slate-950/40 p-3 border border-slate-900/60 rounded-xl space-y-2">
                    <span className="font-semibold text-slate-400 block border-b border-slate-800 pb-1 text-[10px] tracking-wide uppercase">Invoice Billing</span>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Date</span>
                      <span className="text-slate-300 font-medium">{selectedRow.Invoice_Date || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Quantity</span>
                      <span className="text-slate-300 font-semibold font-mono">{formatValue(selectedRow.Invoice_Quantity)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Unit Price</span>
                      <span className="text-slate-300 font-semibold font-mono">{formatCurrency(selectedRow.Invoice_Unit_Price)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-800/40">
                      <span className="text-slate-200 block text-[9px]">Total</span>
                      <span className="text-slate-200 font-bold font-mono">{formatCurrency(selectedRow.Invoice_Total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Exposure Detail */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 mb-5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wide font-semibold">Financial Exposure</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Discrepancy cash difference</span>
                </div>
                <div className="text-right">
                  <span className={`text-base font-mono font-extrabold ${selectedRow.Financial_Exposure > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {formatCurrency(selectedRow.Financial_Exposure)}
                  </span>
                </div>
              </div>

              {/* AI Exception Note */}
              {selectedRow.AI_Note ? (
                <div className="border border-violet-500/10 bg-violet-950/5 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-violet-600/5 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="flex items-center gap-1.5 mb-2.5 text-xs text-violet-400 font-semibold">
                    <Brain className="w-4 h-4" />
                    <span>AI Reconciliation Insights</span>
                    <span className={`text-[9px] ml-auto px-1.5 py-0.2 bg-violet-900/20 border border-violet-500/20 text-violet-400 font-semibold rounded`}>
                      {selectedRow.AI_Confidence} Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{selectedRow.AI_Note}</p>
                </div>
              ) : (
                <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500/40 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Clean Alignment</p>
                  <p className="text-[10px] text-slate-500 mt-1">This record is fully reconciled. No exception notes or narratives require attention.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <h4 className="text-sm font-semibold text-slate-400">Select a record</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Click any row in the ledger sheet to view extensive audit comparison and AI narration notes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
