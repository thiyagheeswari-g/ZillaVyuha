import React, { useEffect, useState } from 'react';
import { Activity, BrainCircuit, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AgentNodeCard } from '../components/ui/AgentNodeCard';
import { AgentDetailPanel } from '../components/ui/AgentDetailPanel';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';

export const MultiAgentFlow = () => {
  const [flow, setFlow] = useState<any>(null);
  const { setActiveFlowId } = useStore();
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchFlow = () => {
      fetch('http://localhost:8090/api/agents/flow/latest')
        .then(res => res.json())
        .then(data => {
          if (data.status !== 'none' && data.status !== 'not_found') {
            setFlow(data);
            setActiveFlowId(data.flow_id);
            if (!activeStepId && data.nodes && data.nodes.length > 0) {
              setActiveStepId(data.nodes[0].id);
            }
          }
        })
        .catch(console.error);
    };
    fetchFlow();
    const int = setInterval(fetchFlow, 2000);
    return () => clearInterval(int);
  }, [setActiveFlowId, activeStepId]);

  const icons = [Activity, BrainCircuit, Users, ShieldCheck, CheckCircle2];

  if (!flow) return <div className="p-8 text-center text-[var(--color-text-muted)] mt-12">{t('ui.noData', 'No active flows. Upload data to start analysis.')}</div>;

  const activeNode = flow.nodes.find((n: any) => n.id === activeStepId) || flow.nodes[0];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6">
      <div className="flex justify-between items-end mb-6 pb-4 border-b border-[var(--color-border-subtle)] shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-[var(--color-text-primary)] flex items-center gap-3">
            {t('sidebar.agents', 'Multi-Agent Flow')}
            <span className="text-[10px] bg-[var(--color-status-low-bg)] text-[var(--color-status-low)] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-[var(--color-status-low)]/20 animate-pulse">Live</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">ID: <span className="font-mono text-[var(--color-accent-blue)]">{flow.flow_id}</span> • Started: {new Date(flow.started_at).toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left column: Pipeline */}
        <div className="w-1/3 pr-6 overflow-y-auto custom-scrollbar">
          <div className="pl-4 pt-4">
            {flow.nodes.map((node: any, idx: number) => (
              <AgentNodeCard 
                key={node.id} 
                node={node} 
                icon={icons[idx % icons.length]} 
                isActive={activeStepId === node.id}
                onClick={() => setActiveStepId(node.id)}
              />
            ))}
          </div>
        </div>

        {/* Right column: Detail Panel */}
        <div className="w-2/3 min-h-0">
          <AgentDetailPanel 
            flowId={flow.flow_id} 
            stepId={activeNode.id} 
            stepName={activeNode.name}
          />
        </div>
      </div>
    </div>
  );
};