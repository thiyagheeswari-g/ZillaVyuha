import React from 'react';

export const StatusBadge = ({ status, label }: { status: string, label?: string }) => {
  let colors = '';
  switch (status.toLowerCase()) {
    case 'running':
    case 'in progress':
      colors = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      break;
    case 'completed':
    case 'success':
      colors = 'bg-[var(--color-status-low-bg)] text-[var(--color-status-low)] border border-[var(--color-status-low)]/20';
      break;
    case 'failed':
    case 'critical':
      colors = 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical)] border border-[var(--color-status-critical)]/20';
      break;
    case 'pending':
      colors = 'bg-[var(--color-status-medium-bg)] text-[var(--color-status-medium)] border border-[var(--color-status-medium)]/20';
      break;
    default:
      colors = 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors}`}>
      {label || status}
    </span>
  );
};
