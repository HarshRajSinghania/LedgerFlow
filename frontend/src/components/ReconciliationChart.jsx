import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ReconciliationChart({ report, stats }) {
  const [chartType, setChartType] = useState('EXPOSURE'); // 'EXPOSURE' or 'STATUS_COUNT'

  // Prepare data for Financial Exposure by Supplier (Top 6)
  const supplierData = useMemo(() => {
    const agg = {};
    report.forEach(row => {
      if (row.Status !== 'MATCHED' && row.Supplier && row.Financial_Exposure > 0) {
        agg[row.Supplier] = (agg[row.Supplier] || 0) + row.Financial_Exposure;
      }
    });

    const list = Object.keys(agg).map(supplier => ({
      name: supplier.length > 15 ? supplier.substring(0, 15) + '...' : supplier,
      fullName: supplier,
      exposure: parseFloat(agg[supplier].toFixed(2))
    }));

    // Sort by exposure descending, take top 6
    return list.sort((a, b) => b.exposure - a.exposure).slice(0, 6);
  }, [report]);

  // Prepare data for Status Counts
  const statusData = useMemo(() => {
    return [
      { name: 'Missing in PO', count: stats.missing_in_po, color: '#be5a38' }, // Rust
      { name: 'Value Mismatch', count: stats.value_mismatch, color: '#c2923f' }, // Mustard
      { name: 'Missing in Invoice', count: stats.missing_in_invoice, color: '#4f748a' }, // Sky
      { name: 'Duplicates', count: stats.duplicates, color: '#73675c' } // Sepia
    ].filter(d => d.count > 0);
  }, [stats]);

  // Format currency for chart labels
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Custom vintage tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#ffffff] border border-[#dcd6cd] p-3 text-xs font-mono shadow-[2px_2px_0px_rgba(44,37,32,0.05)] text-[#2c2520]">
          <p className="font-bold border-b border-[#dcd6cd] pb-1 mb-1">{data.fullName || label}</p>
          <p className="flex justify-between gap-4">
            <span className="text-[#73675c]">{chartType === 'EXPOSURE' ? 'Exposure:' : 'Count:'}</span>
            <strong className={chartType === 'EXPOSURE' ? 'text-[#be5a38]' : 'text-[#3c5946]'}>
              {chartType === 'EXPOSURE' ? formatCurrency(payload[0].value) : payload[0].value}
            </strong>
          </p>
        </div>
      );
    }
    return null;
  };

  const hasExposureData = supplierData.length > 0;

  return (
    <div className="ledger-panel border rounded-lg p-5 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#dcd6cd] pb-3.5 mb-5 gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#be5a38]" />
          <h3 className="text-sm font-bold uppercase tracking-wider font-serif text-[#2c2520]">Audit Ledger Visualizations</h3>
        </div>

        {/* Tab Toggle buttons */}
        <div className="flex border border-[#dcd6cd] p-0.5 rounded bg-[#f7f4eb] self-start sm:self-auto">
          <button
            onClick={() => setChartType('EXPOSURE')}
            className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
              chartType === 'EXPOSURE'
                ? 'bg-[#ffffff] text-[#be5a38] border border-[#dcd6cd] shadow-sm'
                : 'text-[#73675c] hover:text-[#2c2520]'
            }`}
          >
            Exposure by Vendor
          </button>
          <button
            onClick={() => setChartType('STATUS_COUNT')}
            className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
              chartType === 'STATUS_COUNT'
                ? 'bg-[#ffffff] text-[#be5a38] border border-[#dcd6cd] shadow-sm'
                : 'text-[#73675c] hover:text-[#2c2520]'
            }`}
          >
            Discrepancy Volume
          </button>
        </div>
      </div>

      <div className="h-[220px] w-full">
        {chartType === 'EXPOSURE' ? (
          hasExposureData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={supplierData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e2d4" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#73675c" 
                  tick={{ fontSize: 10, fontFamily: 'Space Mono' }}
                  tickLine={{ stroke: '#dcd6cd' }}
                />
                <YAxis 
                  stroke="#73675c" 
                  tick={{ fontSize: 10, fontFamily: 'Space Mono' }}
                  tickLine={{ stroke: '#dcd6cd' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f6f0', opacity: 0.5 }} />
                <Bar dataKey="exposure" fill="#be5a38" maxBarSize={45}>
                  {supplierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#be5a38' : '#c2923f'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#73675c]">
              <TrendingUp className="w-8 h-8 opacity-40 mb-2 text-[#3c5946]" />
              <p className="text-xs font-mono font-bold uppercase">Perfect Ledger Alignment</p>
              <p className="text-[10px] text-[#73675c] max-w-[250px] mt-1">No outstanding financial exposure or exceptions found on any vendor lines.</p>
            </div>
          )
        ) : (
          statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e2d4" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#73675c" 
                  tick={{ fontSize: 10, fontFamily: 'Space Mono' }}
                  tickLine={{ stroke: '#dcd6cd' }}
                />
                <YAxis 
                  stroke="#73675c" 
                  tick={{ fontSize: 10, fontFamily: 'Space Mono' }}
                  tickLine={{ stroke: '#dcd6cd' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f6f0', opacity: 0.5 }} />
                <Bar dataKey="count" maxBarSize={45}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#73675c]">
              <AlertTriangle className="w-8 h-8 opacity-40 mb-2 text-[#3c5946]" />
              <p className="text-xs font-mono font-bold uppercase">No Discrepancies</p>
              <p className="text-[10px] text-[#73675c] max-w-[250px] mt-1">Both sheets are reconciled with a 100% match rate.</p>
            </div>
          )
        )}
      </div>

      <div className="flex justify-between items-center text-[9px] font-mono text-[#73675c] border-t border-[#dcd6cd] pt-3 mt-3">
        <span>* DATA VISUALIZED FROM THE CURRENT RUN</span>
        <span>AUDITOR DIRECTIVE GRAPHS</span>
      </div>
    </div>
  );
}
