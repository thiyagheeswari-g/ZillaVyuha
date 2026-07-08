import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon: LucideIcon;
  colorClass?: string;
}

export const MetricCard = ({ label, value, trend, icon: Icon, colorClass = "text-blue-500" }: MetricCardProps) => {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-5 hover:border-[var(--color-text-secondary)] transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
          <Icon size={20} className={colorClass} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold ${trend.startsWith('+') ? 'text-[var(--color-status-low)]' : 'text-[var(--color-status-critical)]'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h4 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-1">{value}</h4>
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
      </div>
    </div>
  );
};
