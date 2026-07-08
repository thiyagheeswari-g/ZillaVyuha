import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { TranslatedText } from '../TranslatedText';

export const AgentNodeCard = ({ 
  node, 
  icon: Icon,
  isActive,
  onClick
}: { 
  node: any;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <div className="absolute left-6 top-8 bottom-[-2rem] w-px bg-[var(--color-border-subtle)] z-0 group-last:hidden"></div>
      
      <div className="relative z-10 flex gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-colors ${
          isActive ? 'ring-2 ring-[var(--color-accent-blue)] ring-offset-2 ring-offset-[var(--color-bg-app)] ' : ''
        }${
          node.status === 'completed' 
            ? 'bg-[var(--color-bg-sidebar)] border-[var(--color-status-low)]/30 text-[var(--color-status-low)]' 
            : node.status === 'running' 
              ? 'bg-[var(--color-accent-blue)]/10 border-[var(--color-accent-blue)]/30 text-[var(--color-accent-blue)]' 
              : 'bg-[var(--color-bg-sidebar)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
        }`}>
          <Icon size={20} />
        </div>
        
        <div className={`flex-1 bg-[var(--color-bg-card)] border rounded-xl p-4 transition-colors mb-6 ${
          isActive ? 'border-[var(--color-accent-blue)] shadow-md' : 'border-[var(--color-border-subtle)] hover:border-[var(--color-text-secondary)]'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className={`font-semibold text-base ${isActive ? 'text-[var(--color-accent-blue)]' : 'text-[var(--color-text-primary)]'}`}><TranslatedText text={node.name} /></h3>
            <StatusBadge status={node.status} />
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-2">
             {node.duration ? `Duration: ${node.duration}` : 'Waiting...'}
          </div>
        </div>
      </div>
    </div>
  );
};
