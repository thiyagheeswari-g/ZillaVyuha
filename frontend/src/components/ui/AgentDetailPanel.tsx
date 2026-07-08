import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Download, BrainCircuit, Settings2, FileJson, AlertTriangle } from 'lucide-react';
import { TranslatedText } from '../TranslatedText';
import { useTranslation } from 'react-i18next';

export const AgentDetailPanel = ({ flowId, stepId, stepName }: { flowId: string; stepId: string; stepName: string }) => {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agents/flow/${flowId}/step/${stepId}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [flowId, stepId]);

  if (loading) return <div className="p-8 text-center text-[var(--color-text-muted)] animate-pulse">{t('ui.loading', 'Loading details...')}</div>;
  if (!data) return <div className="p-8 text-center text-[var(--color-status-critical)]">{t('ui.errorLoading', 'Failed to load agent data.')}</div>;

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] rounded-r-2xl pl-8 border-l border-[var(--color-border-subtle)]">
      <div className="flex items-center gap-4 mb-6 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="w-10 h-10 rounded-xl bg-accent-gradient text-white flex items-center justify-center shadow-md shrink-0">
          <BrainCircuit size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]"><TranslatedText text={stepName} /> - {t('ui.details', 'Details')}</h2>
        </div>
      </div>

      <div className="flex border-b border-[var(--color-border-subtle)] mb-6 overflow-x-auto hide-scrollbar shrink-0">
        {[
          { id: 'summary', label: 'Overview', icon: CheckCircle2 },
          { id: 'analysis', label: 'Strategic Analysis', icon: Settings2 },
          { id: 'json', label: 'Raw Output', icon: FileJson },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            <tab.icon size={16} /> {t(`ui.${tab.id}`, tab.label)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar pb-8">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm">
              <h3 className="text-md font-semibold border-b border-[var(--color-border-subtle)] pb-2 mb-3">{t('export.executive_summary', 'Executive Summary')}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap"><TranslatedText text={data.executive_summary} /></p>
            </div>
            
            {data.action_plan_steps && data.action_plan_steps.length > 0 && (
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm">
                <h3 className="text-md font-semibold border-b border-[var(--color-border-subtle)] pb-2 mb-3">{t('ui.actionPlan', 'Action Plan')}</h3>
                <ul className="space-y-2">
                  {data.action_plan_steps.map((step: any, i: number) => (
                    <li key={i} className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue)] text-xs flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                      <TranslatedText text={step} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm">
              <h3 className="text-md font-semibold border-b border-[var(--color-border-subtle)] pb-2 mb-3">{t('ui.strategicAnalysis', 'Strategic Analysis')}</h3>
              {data.strategic_analysis && data.strategic_analysis.length > 0 ? (
                <ul className="space-y-3">
                  {data.strategic_analysis.map((item: any, i: number) => (
                    <li key={i} className="text-sm text-[var(--color-text-secondary)] flex items-start gap-3 bg-[var(--color-bg-sidebar)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                      {item.severity === 'critical' ? (
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-status-critical)]" />
                      ) : (
                        <ChevronRight size={16} className="mt-0.5 shrink-0 text-[var(--color-accent-blue)]" />
                      )}
                      <span className={item.severity === 'critical' ? 'text-[var(--color-status-critical)] font-medium' : ''}><TranslatedText text={item.text || item} /></span>
                    </li>
                  ))}
                </ul>
              ) : (
                 <p className="text-sm text-[var(--color-text-muted)] italic">{t('ui.noAnalysis', 'No analysis data available yet.')}</p>
              )}
            </div>
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
