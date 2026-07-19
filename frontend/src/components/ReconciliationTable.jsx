import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Download, ArrowUpDown, Brain, Info, X, AlertTriangle, CheckCircle, HelpCircle, ShieldCheck, PauseCircle, Flag, RotateCcw, Gauge } from 'lucide-react';

const ACTION_CONFIG = {
  APPROVE: { label: 'Approved', icon: ShieldCheck, color: 'text-[#3c5946] bg-[#f2f6f3] border-[#3c5946]/30' },
  HOLD: { label: 'On Hold', icon: PauseCircle, color: 'text-[#c2923f] bg-[#faf8f3] border-[#c2923f]/30' },
  ESCALATE: { label: 'Escalated', icon: Flag, color: 'text-[#be5a38] bg-[#faf3f1] border-[#be5a38]/30' },
  CLEAR: { label: 'Cleared', icon: RotateCcw, color: 'text-[#73675c] bg-[#f8f7f5] border-[#73675c]/30' },
};

function riskColor(score) {
  if (score >= 50) return 'text-[#be5a38] border-[#be5a38]/35 bg-[#faf3f1]';
  if (score >= 25) return 'text-[#c2923f] border-[#c2923f]/35 bg-[#faf8f3]';
  if (score > 0) return 'text-[#4f748a] border-[#4f748a]/30 bg-[#f3f6f8]';
  return 'text-[#73675c] border-[#dcd6cd] bg-[#f8f7f5]';
}

export default function ReconciliationTable({ report, jobId, onBackToUpload, onRowAction }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRow, setSelectedRow] = useState(null);
  const [sortField, setSortField] = useState('Financial_Exposure');
  const [sortAsc, setSortAsc] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState('');

  const takeAction = async (action) => {
    if (!selectedRow || actionPending) return;
    setActionPending(true);
    setActionError('');
    try {
      const res = await fetch(`/api/reconcile/${jobId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedRow.Invoice_ID,
          product_code: selectedRow.Product_Code,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setSelectedRow(data.updated_row);
      onRowAction && onRowAction(data.updated_row);
    } catch (err) {
      setActionError(err.message || 'Could not record that action.');
    } finally {
      setActionPending(false);
    }
  };

  // Flat, stamp-like vintage badges
  const statusConfig = {
    MATCHED: {
      label: 'Matched',
      color: 'bg-[#f2f6f3] text-[#3c5946] border-[#3c5946]/30',
      dot: 'bg-[#3c5946]'
    },
    MISSING_IN_PO: {
      label: 'Missing PO',
      color: 'bg-[#faf3f1] text-[#be5a38] border-[#be5a38]/30',
      dot: 'bg-[#be5a38]'
    },
    MISSING_IN_INVOICE: {
      label: 'Missing Inv',
      color: 'bg-[#f3f6f8] text-[#4f748a] border-[#4f748a]/30',
      dot: 'bg-[#4f748a]'
    },
    VALUE_MISMATCH: {
      label: 'Mismatch',
      color: 'bg-[#faf8f3] text-[#c2923f] border-[#c2923f]/30',
      dot: 'bg-[#c2923f]'
    },
    DUPLICATE_KEY_IN_PO: {
      label: 'PO Dupe',
      color: 'bg-[#f8f7f5] text-[#73675c] border-[#73675c]/35',
      dot: 'bg-[#73675c]'
    },
    DUPLICATE_KEY_IN_INVOICE: {
      label: 'Inv Dupe',
      color: 'bg-[#f8f7f5] text-[#73675c] border-[#73675c]/35',
      dot: 'bg-[#73675c]'
    }
  };

  const getStatusDetails = (status) => {
    return statusConfig[status] || {
      label: status,
      color: 'bg-[#f8f7f5] text-[#73675c] border-[#73675c]/35',
      dot: 'bg-[#73675c]'
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
      { id: 'VALUE_MISMATCH', label: 'Mismatch', count: counts.VALUE_MISMATCH || 0 },
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
          <h2 className="text-xl font-bold font-serif text-[#2c2520] flex items-center gap-2">
            Ledger Reconciliation Sheet
            <span className="text-[10px] font-mono font-bold text-[#73675c] bg-[#f7f4eb] border border-[#dcd6cd] px-2 py-0.5 rounded">
              {report.length} lines parsed
            </span>
          </h2>
          <p className="text-xs text-[#73675c] mt-0.5 font-sans">Inspect comparison balances, audit discrepancies, and click rows to review AI annotations.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToUpload}
            className="px-4 py-2 border border-[#dcd6cd] text-[#73675c] hover:text-[#2c2520] hover:bg-[#f7f4eb] text-xs font-mono font-bold uppercase tracking-wider rounded transition-all"
          >
            Upload New Files
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-[#be5a38] hover:bg-[#a64c2e] text-[#ffffff] text-xs font-mono font-bold uppercase tracking-wider rounded shadow-[2px_2px_0px_rgba(44,37,32,0.15)] transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters & Search bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#73675c]" />
          <input
            type="text"
            placeholder="Search by ID, product, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#ffffff] border border-[#dcd6cd] rounded text-xs text-[#2c2520] placeholder-[#b8ad9e] focus:outline-none focus:border-[#be5a38] font-sans"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0.5 text-[#73675c] hover:text-[#2c2520] rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#be5a38] text-[#ffffff] border-[#be5a38]'
                  : 'bg-[#ffffff] text-[#73675c] border-[#dcd6cd] hover:border-[#73675c] hover:text-[#2c2520]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[9px] px-1 bg-[#f7f4eb] border rounded font-mono ${
                statusFilter === tab.id ? 'border-[#be5a38]/40 text-[#be5a38]' : 'border-[#dcd6cd] text-[#73675c]'
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
        <div className="lg:col-span-2 ledger-panel border border-[#dcd6cd] rounded-lg overflow-hidden bg-[#ffffff]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#dcd6cd] bg-[#f7f4eb] text-[#73675c] font-mono font-bold uppercase tracking-wider">
                  <th className="p-3.5 cursor-pointer hover:bg-[#eae3d2] transition-colors" onClick={() => handleSort('Status')}>
                    <div className="flex items-center gap-1">
                      Status <ArrowUpDown className="w-3 h-3 text-[#73675c]" />
                    </div>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-[#eae3d2] transition-colors" onClick={() => handleSort('Invoice_ID')}>
                    <div className="flex items-center gap-1">
                      Invoice ID / PO <ArrowUpDown className="w-3 h-3 text-[#73675c]" />
                    </div>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-[#eae3d2] transition-colors" onClick={() => handleSort('Product_Name')}>
                    <div className="flex items-center gap-1">
                      Product <ArrowUpDown className="w-3 h-3 text-[#73675c]" />
                    </div>
                  </th>
                  <th className="p-3.5 text-center cursor-pointer hover:bg-[#eae3d2] transition-colors" onClick={() => handleSort('Risk_Score')}>
                    <div className="flex items-center gap-1 justify-center">
                      Risk <ArrowUpDown className="w-3 h-3 text-[#73675c]" />
                    </div>
                  </th>
                  <th className="p-3.5 text-right cursor-pointer hover:bg-[#eae3d2] transition-colors" onClick={() => handleSort('Financial_Exposure')}>
                    <div className="flex items-center gap-1 justify-end">
                      Exposure <ArrowUpDown className="w-3 h-3 text-[#73675c]" />
                    </div>
                  </th>
                  <th className="p-3.5 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcd6cd]/40">
                {filteredReport.length > 0 ? (
                  filteredReport.map((row, idx) => {
                    const statusInfo = getStatusDetails(row.Status);
                    const isSelected = selectedRow && selectedRow.Invoice_ID === row.Invoice_ID && selectedRow.Product_Code === row.Product_Code;
                    
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRow(row)}
                        className={`cursor-pointer transition-colors hover:bg-[#fcfbf9] ${
                          isSelected ? 'table-row-selected bg-[#f7f4eb]' : ''
                        }`}
                      >
                        {/* Status badge */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold border uppercase ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        
                        {/* IDs */}
                        <td className="p-3.5 font-mono font-bold text-[#2c2520]">
                          {row.Invoice_ID}
                          {row.Product_Code && <span className="block text-[9px] text-[#73675c] font-normal mt-0.5">{row.Product_Code}</span>}
                        </td>
                        
                        {/* Product / Supplier */}
                        <td className="p-3.5 max-w-[200px]">
                          <span className="font-serif font-bold text-[#2c2520] block truncate">{row.Product_Name || 'n/a'}</span>
                          <span className="text-[9px] text-[#73675c] block truncate mt-0.5">{row.Supplier || 'n/a'}</span>
                          {row.Action && ACTION_CONFIG[row.Action] && (
                            <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border uppercase ${ACTION_CONFIG[row.Action].color}`}>
                              {React.createElement(ACTION_CONFIG[row.Action].icon, { className: 'w-2.5 h-2.5' })}
                              {ACTION_CONFIG[row.Action].label}
                            </span>
                          )}
                        </td>

                        {/* Risk Score */}
                        <td className="p-3.5 text-center">
                          {row.Status !== 'MATCHED' ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${riskColor(row.Risk_Score)}`}>
                              <Gauge className="w-2.5 h-2.5" />
                              {row.Risk_Score}
                            </span>
                          ) : (
                            <span className="text-[#dcd6cd] text-[9px] font-mono">—</span>
                          )}
                        </td>

                        {/* Financial Exposure */}
                        <td className="p-3.5 text-right font-mono font-bold">
                          {row.Financial_Exposure > 0 ? (
                            <span className="text-[#be5a38] font-bold">{formatCurrency(row.Financial_Exposure)}</span>
                          ) : (
                            <span className="text-[#73675c]">{formatCurrency(row.Financial_Exposure)}</span>
                          )}
                        </td>

                        {/* Expand Icon */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            className={`p-1 rounded transition-all ${
                              isSelected ? 'bg-[#be5a38]/10 text-[#be5a38] border border-[#be5a38]/30' : 'text-[#73675c] hover:text-[#2c2520] border border-transparent'
                            }`}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-[#73675c] font-mono text-xs">
                      No records matched the filter criteria.
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
            <div className="ledger-panel border border-[#dcd6cd] rounded-lg p-5 bg-[#ffffff] shadow-sm relative animate-fade-in">
              <button
                onClick={() => setSelectedRow(null)}
                className="absolute top-4 right-4 p-1 text-[#73675c] hover:text-[#be5a38] rounded border border-transparent hover:border-[#dcd6cd] transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <span className="text-[9px] font-mono font-bold text-[#73675c] tracking-wider uppercase">Audit inspector</span>
              
              {/* Product and Supplier headers */}
              <div className="mt-2 mb-4">
                <h3 className="text-sm font-bold font-serif text-[#2c2520]">{selectedRow.Product_Name || 'Product: ' + selectedRow.Product_Code}</h3>
                <p className="text-[11px] text-[#73675c] mt-0.5">{selectedRow.Supplier || 'Unknown Supplier'}</p>
                <span className="text-[9px] text-[#73675c] font-mono block mt-1 border-t border-[#f7f4eb] pt-1">Invoice ID: {selectedRow.Invoice_ID} • SKU: {selectedRow.Product_Code}</span>
              </div>

              {/* Status Indicator */}
              <div className="mb-4">
                <div className={`flex items-center justify-between p-2.5 border rounded bg-[#f7f4eb]/40 ${getStatusDetails(selectedRow.Status).color}`}>
                  <span className="text-[10px] font-mono font-bold uppercase">Status</span>
                  <span className="text-[9px] font-mono font-bold uppercase">{getStatusDetails(selectedRow.Status).label}</span>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="space-y-3 mb-5">
                <h4 className="text-[10px] font-mono font-bold uppercase text-[#73675c] border-b border-[#dcd6cd] pb-1">Ledger Comparison</h4>
                
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  {/* Purchase Order Details */}
                  <div className="bg-[#fcfbf9] p-3 border border-[#dcd6cd] rounded space-y-1.5">
                    <span className="font-bold text-[#73675c] block border-b border-[#dcd6cd] pb-1 text-[9px] font-mono uppercase">Purchase Order</span>
                    <div>
                      <span className="text-[#73675c] block text-[8px] font-mono">Date</span>
                      <span className="text-[#2c2520] font-medium">{selectedRow.PO_Date || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[#73675c] block text-[8px] font-mono">Quantity</span>
                      <span className="text-[#2c2520] font-bold font-mono">{formatValue(selectedRow.PO_Quantity)}</span>
                    </div>
                    <div>
                      <span className="text-[#73675c] block text-[8px] font-mono">Unit Price</span>
                      <span className="text-[#2c2520] font-bold font-mono">{formatCurrency(selectedRow.PO_Unit_Price)}</span>
                    </div>
                    <div className="pt-1 border-t border-[#dcd6cd]/60">
                      <span className="text-[#73675c] block text-[8px] font-mono">Total</span>
                      <span className="text-[#2c2520] font-bold font-mono">{formatCurrency(selectedRow.PO_Total)}</span>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="bg-[#fcfbf9] p-3 border border-[#dcd6cd] rounded space-y-1.5">
                    <span className="font-bold text-[#73675c] block border-b border-[#dcd6cd] pb-1 text-[9px] font-mono uppercase">Invoice Billing</span>
                    <div>
                      <span className="text-[#73675c] block text-[8px] font-mono">Date</span>
                      <span className="text-[#2c2520] font-medium">{selectedRow.Invoice_Date || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[#73675c] block text-[8px] font-mono">Quantity</span>
                      <span className="text-[#2c2520] font-bold font-mono">{formatValue(selectedRow.Invoice_Quantity)}</span>
                    </div>
                    <div>
                      <span className="text-[#73675c] block text-[8px] font-mono">Unit Price</span>
                      <span className="text-[#2c2520] font-bold font-mono">{formatCurrency(selectedRow.Invoice_Unit_Price)}</span>
                    </div>
                    <div className="pt-1 border-t border-[#dcd6cd]/60">
                      <span className="text-[#2c2520] block text-[8px] font-mono">Total</span>
                      <span className="text-[#2c2520] font-bold font-mono">{formatCurrency(selectedRow.Invoice_Total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Exposure Detail */}
              <div className="bg-[#f7f4eb] border border-[#dcd6cd] rounded p-3 mb-5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#73675c] block text-[8px] font-mono uppercase font-bold">Financial Exposure</span>
                  <span className="text-[9px] text-[#73675c]">Discrepancy valuation difference</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-mono font-bold ${selectedRow.Financial_Exposure > 0 ? 'text-[#be5a38]' : 'text-[#73675c]'}`}>
                    {formatCurrency(selectedRow.Financial_Exposure)}
                  </span>
                </div>
              </div>

              {/* Risk Flags */}
              {selectedRow.Status !== 'MATCHED' && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-mono font-bold uppercase text-[#73675c]">Risk Assessment</h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${riskColor(selectedRow.Risk_Score)}`}>
                      <Gauge className="w-2.5 h-2.5" /> {selectedRow.Risk_Score} / 100
                    </span>
                  </div>
                  {selectedRow.Risk_Flags && selectedRow.Risk_Flags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRow.Risk_Flags.map((flag) => (
                        <span key={flag} className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-[#f7f4eb] border border-[#dcd6cd] text-[#73675c] rounded uppercase">
                          {flag.replaceAll('_', ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-[#73675c] font-mono">No structural risk indicators beyond the status itself.</p>
                  )}
                </div>
              )}

              {/* Action Workflow */}
              {selectedRow.Status !== 'MATCHED' && (
                <div className="mb-5">
                  <h4 className="text-[10px] font-mono font-bold uppercase text-[#73675c] border-b border-[#dcd6cd] pb-1 mb-2.5">Take Action</h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => takeAction('APPROVE')}
                      disabled={actionPending}
                      className="flex flex-col items-center gap-1 py-2 border border-[#3c5946]/30 bg-[#f2f6f3] text-[#3c5946] hover:bg-[#3c5946] hover:text-white rounded text-[9px] font-mono font-bold uppercase transition-all disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => takeAction('HOLD')}
                      disabled={actionPending}
                      className="flex flex-col items-center gap-1 py-2 border border-[#c2923f]/30 bg-[#faf8f3] text-[#c2923f] hover:bg-[#c2923f] hover:text-white rounded text-[9px] font-mono font-bold uppercase transition-all disabled:opacity-50"
                    >
                      <PauseCircle className="w-3.5 h-3.5" /> Hold
                    </button>
                    <button
                      onClick={() => takeAction('ESCALATE')}
                      disabled={actionPending}
                      className="flex flex-col items-center gap-1 py-2 border border-[#be5a38]/30 bg-[#faf3f1] text-[#be5a38] hover:bg-[#be5a38] hover:text-white rounded text-[9px] font-mono font-bold uppercase transition-all disabled:opacity-50"
                    >
                      <Flag className="w-3.5 h-3.5" /> Escalate
                    </button>
                  </div>
                  {selectedRow.Action && (
                    <button
                      onClick={() => takeAction('CLEAR')}
                      disabled={actionPending}
                      className="w-full mt-1.5 flex items-center justify-center gap-1 py-1.5 border border-[#dcd6cd] text-[#73675c] hover:text-[#2c2520] rounded text-[9px] font-mono font-bold uppercase transition-all disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear decision
                    </button>
                  )}
                  {actionError && (
                    <p className="text-[9px] text-[#be5a38] font-mono mt-2">{actionError}</p>
                  )}
                </div>
              )}

              {/* AI Exception Note */}
              {selectedRow.AI_Note ? (
                <div className="border border-[#be5a38]/20 bg-[#faf3f1]/30 rounded p-4 relative">
                  <div className="flex items-center gap-1 mb-2 text-xs text-[#be5a38] font-bold uppercase font-mono">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Auditor Insights</span>
                    <span className="text-[8px] ml-auto px-1 bg-[#ffffff] border border-[#be5a38]/20 text-[#be5a38] font-bold rounded">
                      {selectedRow.AI_Confidence} Conf.
                    </span>
                  </div>
                  <p className="text-[11px] font-serif text-[#2c2520] leading-relaxed italic">{selectedRow.AI_Note}</p>
                </div>
              ) : (
                <div className="border border-[#dcd6cd] bg-[#fdfdfd] rounded p-4 text-center">
                  <CheckCircle className="w-5 h-5 text-[#3c5946]/40 mx-auto mb-1.5" />
                  <p className="text-[10px] font-serif font-bold text-[#2c2520]">Clean Audit Alignment</p>
                  <p className="text-[9px] text-[#73675c] font-mono mt-0.5">This entry balances perfectly. No exceptions flagged.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="ledger-panel border border-dashed border-[#dcd6cd] rounded-lg p-8 text-center text-[#73675c] bg-[#ffffff]/50">
              <SlidersHorizontal className="w-8 h-8 mx-auto mb-3 text-[#b8ad9e]" />
              <h4 className="text-xs font-bold uppercase tracking-wider font-serif text-[#2c2520]">Select a record</h4>
              <p className="text-[10px] text-[#73675c] font-mono mt-1 max-w-[200px] mx-auto">Click any row in the ledger sheet to inspect side comparison balances and exception notes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
