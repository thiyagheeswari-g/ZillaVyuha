import React, { useState, useMemo } from 'react';
import { Lightbulb, CheckCircle2, XCircle, Edit3 } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useTranslation } from 'react-i18next';
import { TranslatedText } from '../components/TranslatedText';
import { useStore } from '../store/useStore';

export const Recommendations = () => {
  const { resourcePlan, validationResult, officerDecisions, addOfficerDecision } = useStore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const { t } = useTranslation();

  const recommendations = useMemo(() => {
    // Map decisions onto recommendations
    const baseRecs = (validationResult?.final_recommendations || resourcePlan?.recommendations || []);
    return baseRecs.map((r: any) => {
      const decision = officerDecisions.find(d => d.id === r.recommendation_id);
      if (decision) {
        return { ...r, status: decision.action === 'approve' || decision.action === 'approved' ? 'approved' : 'rejected' };
      }
      return r;
    });
  }, [resourcePlan, validationResult, officerDecisions]);

  const handleDecision = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      addOfficerDecision({ id, action });
      await fetch(`http://localhost:8090/api/recommendations/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const getFilteredRecs = () => {
    if (activeTab === 'All') return recommendations;
    if (activeTab === 'Medicine Transfers') return recommendations.filter((r: any) => r.resource_type === 'Medicine');
    if (activeTab === 'Doctor Redistribution') return recommendations.filter((r: any) => r.resource_type === 'Doctor' || r.resource_type === 'Nurse');
    if (activeTab === 'Bed Optimization') return recommendations.filter((r: any) => r.resource_type === 'Equipment' || r.resource_type === 'Infrastructure');
    return recommendations;
  };

  const filtered = getFilteredRecs();

  if (!resourcePlan && !validationResult) {
    return <div className="p-8 text-center text-[var(--color-text-muted)] mt-12">{t('ui.noData', 'No data yet. Please upload data.')}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <Lightbulb className="text-[var(--color-accent-blue)]" /> {t('sidebar.recommendations', 'AI Recommendations')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('ui.reviewApprove', 'Review and approve automated resource optimization actions.')}</p>
        </div>
      </div>

      <div className="flex bg-[var(--color-bg-sidebar)] p-1 rounded-lg border border-[var(--color-border-subtle)] w-fit mb-8">
        {['All', 'Medicine Transfers', 'Doctor Redistribution', 'Bed Optimization'].map(tStr => (
          <button 
            key={tStr}
            onClick={() => setActiveTab(tStr)} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tStr ? 'bg-[var(--color-bg-card)] text-white shadow' : 'text-[var(--color-text-secondary)] hover:text-white'}`}
          >
            {tStr === 'All' ? t('ui.all') : tStr === 'Medicine Transfers' ? t('ui.medicineTransfers') : tStr === 'Doctor Redistribution' ? t('ui.doctorRedistribution') : t('ui.bedOptimization')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-[var(--color-text-muted)] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-subtle)]">
          {t('ui.noRecommendations', 'No recommendations found for this category.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((rec: any) => (
            <div key={rec.recommendation_id} className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-[var(--color-text-primary)] mb-1"><TranslatedText text={rec.action} /></h3>
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded uppercase tracking-wider font-bold ${
                      rec.priority === 'CRITICAL' ? 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical)]' :
                      rec.priority === 'HIGH' ? 'bg-[var(--color-status-high-bg)] text-[var(--color-status-high)]' :
                      'bg-[var(--color-status-moderate-bg)] text-[var(--color-status-moderate)]'
                    }`}>
                      {rec.priority}
                    </span>
                    • {rec.confidence_score}% {t('ui.confidence', 'Confidence')}
                  </div>
                </div>
                {rec.status ? <StatusBadge status={rec.status} /> : <StatusBadge status="pending" />}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mb-4 bg-[var(--color-bg-sidebar)] p-4 rounded-lg border border-[var(--color-border-subtle)]/50 border-l-2 border-l-[var(--color-accent-blue)]">
                <TranslatedText text={rec.reason} />
              </div>
              {!rec.status && (
                <div className="mt-auto flex justify-end gap-2 pt-4 border-t border-[var(--color-border-subtle)] flex-wrap">
                  <button onClick={() => handleDecision(rec.recommendation_id, 'reject')} disabled={processingId === rec.recommendation_id} className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] rounded-lg flex items-center gap-2 hover:bg-[var(--color-bg-sidebar)]">
                    <XCircle size={16} /> {t('ui.reject', 'Reject')}
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] rounded-lg flex items-center gap-2 hover:bg-[var(--color-bg-sidebar)]">
                    <Edit3 size={16} /> {t('ui.modify', 'Modify')}
                  </button>
                  <button onClick={() => handleDecision(rec.recommendation_id, 'approve')} disabled={processingId === rec.recommendation_id} className="px-4 py-2 text-sm font-medium text-white bg-accent-gradient rounded-lg flex items-center gap-2 hover:opacity-90">
                    <CheckCircle2 size={16} /> {t('ui.approve', 'Approve')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};