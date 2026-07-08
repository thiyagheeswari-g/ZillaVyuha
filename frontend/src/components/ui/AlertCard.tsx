import React from 'react';
import { AlertTriangle, Clock, MapPin } from 'lucide-react';

export const AlertCard = ({ alert }: { alert: any }) => {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] border-l-4 border-l-[var(--color-status-critical)] rounded-lg p-4 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <AlertTriangle size={18} className="text-[var(--color-status-critical)]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{alert.issue}</h4>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><MapPin size={12}/> {alert.facilityName} ({alert.facilityCode})</span>
            <span className="flex items-center gap-1"><Clock size={12}/> {alert.timestamp}</span>
          </div>
        </div>
      </div>
      <button className="px-3 py-1.5 bg-[var(--color-bg-sidebar)] hover:bg-[var(--color-border-subtle)] border border-[var(--color-border-subtle)] rounded text-xs font-medium transition-colors shrink-0">
        Review
      </button>
    </div>
  );
};