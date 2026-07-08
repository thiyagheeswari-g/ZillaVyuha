import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, CheckCircle2, ChevronRight, Download, BrainCircuit, Settings2, FileJson } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';

export const AgentDetail = () => {
  const { flowId, stepId } = useParams();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    fetch(`http://localhost:8090/api/agents/flow/${flowId}/step/${stepId}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [flowId, stepId]);

  if (!data) return <div className="p-8 text-center text-[var(--color-text-muted)]">Loading details...</div>;

  return (
    <div className="max-w-6xl mx-auto py-6">
      <Link to="/agent-flow" className="inline-flex items-center text-sm font-medium text-[var(--color-text-secondary)] hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} className="mr-2" /> Back to Flow View
      </Link>
      
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-gradient text-white flex items-center justify-center shadow-lg">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">Agent Node Details</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Flow: {flowId} • Step: {stepId}</p>
          </div>
        </div>
        <StatusBadge status="completed" />
      </div>

      <div className="flex border-b border-[var(--color-border-subtle)] mb-6 overflow-x-auto hide-scrollbar">
        {[
          { id: 'summary', label: 'Executive Summary', icon: CheckCircle2 },
          { id: 'analysis', label: 'Strategic Analysis', icon: Settings2 },
          { id: 'json', label: 'Raw Output', icon: FileJson },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-white'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-6 min-h-[400px]">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold border-b border-[var(--color-border-subtle)] pb-2">Executive Summary</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{data.executive_summary}</p>
          </div>
        )}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold border-b border-[var(--color-border-subtle)] pb-2">Strategic Analysis</h3>
            <ul className="space-y-3">
              {data.strategic_analysis?.map((item: any, i: number) => (
                <li key={i} className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2 bg-[var(--color-bg-sidebar)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                  <ChevronRight size={16} className="mt-0.5 shrink-0 text-[var(--color-accent-blue)]" />
                  {item.text || item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === 'json' && (
          <div className="bg-[#0D1117] rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-sidebar)] border-b border-[var(--color-border-subtle)]">
              <span className="text-xs font-mono text-[var(--color-text-secondary)]">output.json</span>
              <button className="text-[var(--color-text-muted)] hover:text-white transition-colors"><Download size={14}/></button>
            </div>
            <pre className="p-4 text-xs font-mono text-[var(--color-text-secondary)] overflow-x-auto">
              {JSON.stringify(data.output_to_next_agent, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};