import React, { useState, useMemo } from 'react';
import { Package, Search, Filter, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Resources = () => {
  const [filter, setFilter] = useState('All');
  const { clinicalFindings } = useStore();

  const inventory = useMemo(() => {
    if (!clinicalFindings || !clinicalFindings.medicine_findings) return [];
    
    const items: any[] = [];
    clinicalFindings.medicine_findings.forEach((mf: any) => {
      Object.entries(mf.inventory_by_phc || {}).forEach(([code, drugs]: [string, any]) => {
        drugs.forEach((d: any, idx: number) => {
          items.push({
            id: `${code}-${idx}`,
            facility: code,
            item: d.medicine_name || 'Unknown',
            type: 'Medicine',
            stock: d.current_stock || 0,
            usagePerDay: d.avg_daily_consumption || 0,
            daysLeft: d.days_remaining || 0,
            status: d.days_remaining <= 2 ? 'Critical' : (d.days_remaining <= 7 ? 'High' : 'Stable')
          });
        });
      });
    });
    return items;
  }, [clinicalFindings]);

  const filtered = filter === 'All' ? inventory : inventory.filter(i => i.type === filter);
  
  if (!clinicalFindings) {
    return <div className="p-8 text-center text-[var(--color-text-muted)] mt-12">No data yet. Upload PHC data first.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <Package className="text-[var(--color-accent-blue)]" /> District Resources
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Monitor inventory levels across all facilities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-4 rounded-xl">
          <div className="text-sm text-[var(--color-text-secondary)]">Total Medicines Tracked</div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">45,210</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-4 rounded-xl">
          <div className="text-sm text-[var(--color-text-secondary)]">Critical Shortages</div>
          <div className="text-2xl font-bold text-[var(--color-status-critical)] mt-1 flex items-center gap-2">
            <AlertTriangle size={20}/> 12 Items
          </div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-4 rounded-xl">
          <div className="text-sm text-[var(--color-text-secondary)]">Avg District Stock</div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">14 Days</div>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-4 rounded-xl">
          <div className="text-sm text-[var(--color-text-secondary)]">Active Transfers</div>
          <div className="text-2xl font-bold text-[var(--color-accent-blue)] mt-1">8 Pending</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {['All', 'Medicine', 'Equipment', 'Infrastructure'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f 
                ? 'bg-[var(--color-accent-blue)] border-[var(--color-accent-blue)] text-white' 
                : 'bg-transparent border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-sidebar)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-6 py-4 font-medium">Facility</th>
              <th className="px-6 py-4 font-medium">Item</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Current Stock</th>
              <th className="px-6 py-4 font-medium">Usage/Day</th>
              <th className="px-6 py-4 font-medium">Days Left</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {filtered.map(i => (
              <tr key={i.id} className="hover:bg-[var(--color-bg-sidebar)]/50 transition-colors">
                <td className="px-6 py-4 font-medium text-[var(--color-text-primary)]">{i.facility}</td>
                <td className="px-6 py-4 text-[var(--color-text-primary)]">{i.item}</td>
                <td className="px-6 py-4 text-[var(--color-text-secondary)]">{i.type}</td>
                <td className="px-6 py-4 text-[var(--color-text-secondary)]">{i.stock}</td>
                <td className="px-6 py-4 text-[var(--color-text-secondary)]">{i.usagePerDay}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    i.status === 'Critical' ? 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical)]' :
                    i.status === 'High' ? 'bg-[var(--color-status-high-bg)] text-[var(--color-status-high)]' :
                    'bg-[var(--color-status-moderate-bg)] text-[var(--color-status-moderate)]'
                  }`}>
                    {typeof i.daysLeft === 'number' ? (i.daysLeft > 100 ? '99+' : i.daysLeft.toFixed(1)) : i.daysLeft} days
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
