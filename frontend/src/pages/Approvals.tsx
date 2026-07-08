import React, { useState, useMemo } from 'react';
import { CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useStore } from '../store/useStore';

export const Approvals = () => {
  const { resourcePlan, validationResult, officerDecisions, addOfficerDecision } = useStore();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const recommendations = useMemo(() => {
    return (validationResult?.final_recommendations || resourcePlan?.recommendations || []);
  }, [resourcePlan, validationResult]);

  const pendingApprovals = useMemo(() => {
    return recommendations.filter((r: any) => 
      !officerDecisions.some(d => d.id === r.recommendation_id)
    );
  }, [recommendations, officerDecisions]);

  const handleDecision = async (id: string, action: string, recommendation: any) => {
    setProcessingId(id);
    try {
      // Optimitic update to global store
      addOfficerDecision({ id, action: action.toLowerCase(), recommendation });
      
      // Still notify the backend
      await fetch(`/api/recommendations/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          officer_note: `Action ${action} by user via UI`,
          original_recommendation: recommendation
        })
      });
    } catch (e) {
      console.error(e);
      // In a real app we might revert the optimistic update here
    } finally {
      setProcessingId(null);
    }
  };

  if (!resourcePlan && !validationResult) {
    return <div className="p-8 text-center text-[var(--color-text-muted)] mt-12">No data yet. Please upload data.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <CheckSquare className="text-[var(--color-accent-blue)]" /> Approvals
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage pending actions requiring human oversight.</p>
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sidebar)] flex justify-between items-center">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Pending Your Review</h3>
          <span className="bg-[var(--color-status-critical)] text-white text-xs font-bold px-2 py-1 rounded-full">{pendingApprovals.length} Items</span>
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center">
               <AlertCircle className="mb-2 text-[var(--color-border-subtle)]" size={32} />
               <p>No pending approvals. Ensure a pipeline has successfully generated recommendations.</p>
            </div>
          ) : pendingApprovals.map((app: any) => (
            <div key={app.recommendation_id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--color-bg-sidebar)]/30 transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wider font-bold ${
                      app.priority === 'CRITICAL' ? 'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical)]' :
                      'bg-[var(--color-status-high-bg)] text-[var(--color-status-high)]'
                    }`}>
                      {app.priority}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{app.action} {app.resource_type}</span>
                  <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1"><Clock size={12}/> Just now</span>
                </div>
                <p className="text-base font-semibold text-[var(--color-text-primary)]">
                  {app.action} {app.quantity} of {app.resource_name} from {app.from_facility} to {app.to_facility}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{app.reason}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => handleDecision(app.recommendation_id, "REJECTED", app)}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] rounded-lg hover:bg-[var(--color-bg-sidebar)]"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleDecision(app.recommendation_id, "APPROVED", app)}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-gradient rounded-lg hover:opacity-90"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
