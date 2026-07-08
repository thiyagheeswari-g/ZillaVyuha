import React, { useState } from 'react';
import { Building2, Search, Filter } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Facilities = () => {
  const [tab, setTab] = useState('PHC');
  const [search, setSearch] = useState('');
  const { clinicalFindings } = useStore();

  if (!clinicalFindings) {
    return <div className="p-8 text-center text-[var(--color-text-muted)] mt-12">No data yet. Upload PHC data first.</div>;
  }

  // Derive facilities from clinicalFindings
  const facilitiesMap = new Map<string, any>();

  // Helper to init facility in map
  const getFac = (code: string, type: string = 'PHC', name: string = '') => {
    if (!facilitiesMap.has(code)) {
      facilitiesMap.set(code, { id: code, code, name: name || code, type, risk: 'Moderate', bedOcc: 0, docAtt: 100, medStock: 99, updated: 'Just now' });
    }
    return facilitiesMap.get(code);
  };

  // Process bed findings
  clinicalFindings.bed_findings?.forEach((bf: any) => {
    Object.entries(bf.bed_status_by_chc || {}).forEach(([code, data]: [string, any]) => {
      const fac = getFac(code, 'CHC');
      fac.bedOcc = Math.round((data.occupancy_rate || 0) * 100);
      if (fac.bedOcc > 85) fac.risk = 'High';
      if (fac.bedOcc > 95) fac.risk = 'Critical';
    });
  });

  // Process attendance findings
  clinicalFindings.attendance_findings?.forEach((af: any) => {
    Object.entries(af.attendance_by_phc || {}).forEach(([code, data]: [string, any]) => {
      const fac = getFac(code, 'PHC');
      fac.docAtt = Math.round((data.attendance_rate || 0) * 100);
      if (fac.docAtt < 50) fac.risk = 'High';
    });
  });

  // Process medicine findings
  clinicalFindings.medicine_findings?.forEach((mf: any) => {
    Object.entries(mf.inventory_by_phc || {}).forEach(([code, items]: [string, any]) => {
      const fac = getFac(code, code.startsWith('CHC') ? 'CHC' : 'PHC');
      const minStock = items.reduce((min: number, item: any) => Math.min(min, item.days_remaining || 99), 99);
      fac.medStock = minStock === 99 ? 'N/A' : minStock.toFixed(1);
      if (minStock <= 2) fac.risk = 'High';
      if (minStock <= 1) fac.risk = 'Critical';
    });
  });

  const facilities = Array.from(facilitiesMap.values());

  const filtered = facilities.filter(f => 
    f.type === tab && 
    (f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <Building2 className="text-[var(--color-accent-blue)]" /> Facilities
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage and view status of all PHCs and CHCs.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex bg-[var(--color-bg-sidebar)] p-1 rounded-lg border border-[var(--color-border-subtle)]">
          <button 
            onClick={() => setTab('PHC')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'PHC' ? 'bg-[var(--color-bg-card)] text-white shadow' : 'text-[var(--color-text-secondary)] hover:text-white'}`}
          >
            All PHCs
          </button>
          <button 
            onClick={() => setTab('CHC')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'CHC' ? 'bg-[var(--color-bg-card)] text-white shadow' : 'text-[var(--color-text-secondary)] hover:text-white'}`}
          >
            All CHCs
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input 
            type="text" 
            placeholder="Search facility..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-[var(--color-bg-sidebar)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-accent-blue)] w-full sm:w-64"
          />
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-bg-sidebar)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-6 py-4 font-medium">Facility</th>
                <th className="px-6 py-4 font-medium">Risk Level</th>
                <th className="px-6 py-4 font-medium">Bed Occ.</th>
                <th className="px-6 py-4 font-medium">Doc Att.</th>
                <th className="px-6 py-4 font-medium">Med Stock</th>
                <th className="px-6 py-4 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-[var(--color-bg-sidebar)]/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--color-text-primary)]">{f.name}</div>
                    <div className="text-[var(--color-text-muted)] text-xs">{f.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      f.risk === 'Critical' ? 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical)]' :
                      f.risk === 'High' ? 'bg-[var(--color-status-high-bg)] text-[var(--color-status-high)]' :
                      'bg-[var(--color-status-moderate-bg)] text-[var(--color-status-moderate)]'
                    }`}>
                      {f.risk}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{f.bedOcc}%</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{f.docAtt}%</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{f.medStock} days</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{f.updated}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-text-muted)]">No facilities found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
