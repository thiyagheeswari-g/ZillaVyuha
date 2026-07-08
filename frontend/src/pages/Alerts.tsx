import React, { useState, useMemo } from 'react';
import { AlertTriangle, Clock, MapPin, Filter } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TranslatedText } from '../components/TranslatedText';
export const Alerts = () => {
  const { clinicalFindings } = useStore();
  const [filter, setFilter] = useState('All');

  const alerts = useMemo(() => {
    if (!clinicalFindings) return [];
    
    const generatedAlerts: any[] = [];
    
    // Add anomalies as critical/high alerts
    if (clinicalFindings.anomalies) {
      clinicalFindings.anomalies.forEach((a: any, i: number) => {
        generatedAlerts.push({
          id: `anomaly-${i}`,
          facilityCode: a.phc_code || a.facility_id || 'Unknown',
          facilityName: a.phc_code || a.facility_id || 'Unknown Facility',
          issue: a.column && a.value ? `Anomaly in ${a.column}: ${a.value}` : `Anomaly: ${a.message || a.issue || a.description || Object.values(a).join(' ')}`,
          severity: 'critical',
          timestamp: 'Just now'
        });
      });
    }

    // Add urgent forecasts as high alerts
    if (clinicalFindings.forecasts) {
      clinicalFindings.forecasts.filter((f: any) => f.days_until_stockout <= 7).forEach((f: any, i: number) => {
        generatedAlerts.push({
          id: `forecast-${i}`,
          facilityCode: f.phc_code,
          facilityName: f.phc_code,
          issue: `${f.medicine_name} will run out in ${f.days_until_stockout.toFixed(1)} days`,
          severity: f.days_until_stockout <= 2 ? 'critical' : 'high',
          timestamp: 'Just now'
        });
      });
    }

    // Add bed occupancy as alerts
    if (clinicalFindings.bed_findings) {
      clinicalFindings.bed_findings.forEach((bf: any, i: number) => {
        Object.entries(bf.bed_status_by_chc || {}).forEach(([code, data]: [string, any]) => {
          if ((data.occupancy_rate || 0) > 0.85) {
            generatedAlerts.push({
              id: `bed-${i}-${code}`,
              facilityCode: code,
              facilityName: code,
              issue: `High Bed Occupancy (${Math.round((data.occupancy_rate || 0) * 100)}%)`,
              severity: (data.occupancy_rate || 0) > 0.95 ? 'critical' : 'high',
              timestamp: 'Just now'
            });
          }
        });
      });
    }

    return generatedAlerts;
  }, [clinicalFindings]);

  const filteredAlerts = filter === 'All' 
    ? alerts 
    : alerts.filter(a => a.severity.toLowerCase() === filter.toLowerCase());

  const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const getBorderColor = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'critical': return 'border-l-[var(--color-status-critical)]';
      case 'high': return 'border-l-[var(--color-status-high)]';
      case 'medium': return 'border-l-[var(--color-status-moderate)]';
      default: return 'border-l-[var(--color-status-low)]';
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <AlertTriangle className="text-[var(--color-status-critical)]" /> Alerts Center
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage and respond to system-generated critical alerts.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
        <Filter size={16} className="text-[var(--color-text-muted)] mr-2 shrink-0" />
        {severities.map(s => (
          <button 
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === s 
                ? 'bg-[var(--color-accent-blue)] border-[var(--color-accent-blue)] text-white' 
                : 'bg-transparent border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-subtle)]">
            No alerts found for this severity.
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div key={alert.id} className={`bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] border-l-4 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${getBorderColor(alert.severity)}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                    alert.severity === 'critical' ? 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical)]' :
                    alert.severity === 'high' ? 'bg-[var(--color-status-high-bg)] text-[var(--color-status-high)]' :
                    'bg-[var(--color-status-moderate-bg)] text-[var(--color-status-moderate)]'
                  }`}>
                    {alert.severity}
                  </span>
                  <h4 className="text-base font-semibold text-[var(--color-text-primary)]"><TranslatedText text={alert.issue} /></h4>
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mt-1">
                  <span className="flex items-center gap-1"><MapPin size={14}/> {alert.facilityName} ({alert.facilityCode})</span>
                  <span className="flex items-center gap-1"><Clock size={14}/> {alert.timestamp}</span>
                </div>
              </div>
              <button className="px-4 py-2 bg-[var(--color-bg-sidebar)] hover:bg-[var(--color-border-subtle)] border border-[var(--color-border-subtle)] rounded text-sm font-medium transition-colors shrink-0 text-white">
                View Output
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};