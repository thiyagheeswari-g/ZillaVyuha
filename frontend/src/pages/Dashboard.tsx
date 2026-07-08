import React from 'react';
import { Users, Activity, Pill, UserCheck, AlertTriangle } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { AlertCard } from '../components/ui/AlertCard';
import { useStore } from '../store/useStore';

export const Dashboard = () => {
  const { operationalPlan, clinicalFindings } = useStore();

  if (!operationalPlan || !clinicalFindings) {
    return <div className="p-8 text-center text-[var(--color-text-muted)] mt-12">No data yet. Please upload data.</div>;
  }

  // Calculate real values from findings
  let todays_footfall = 0;
  clinicalFindings.footfall_findings?.forEach((ff: any) => {
    Object.values(ff.footfall_by_phc || {}).forEach((phcData: any) => {
      todays_footfall += phcData.today_count || 0;
    });
  });

  const kpis = {
    total_phcs: Object.keys(clinicalFindings.footfall_findings?.[0]?.footfall_by_phc || {}).length || 0,
    population_covered: "4.2L",
    todays_footfall: todays_footfall || 0,
    footfall_trend: "+18%"
  };

  const riskScore = operationalPlan.district_status === 'CRITICAL' ? 85 : 
                    operationalPlan.district_status === 'HIGH' ? 68 : 45;

  // Active Alerts based on Zero_Doctor_Day_Flag or Stockout Warning
  const critical_alerts: any[] = [];
  
  clinicalFindings.attendance_findings?.forEach((af: any) => {
    (af.critical_gaps || []).forEach((gap: any) => {
      if (gap.zero_doctor_day_flag) {
        critical_alerts.push({
          id: `DOC-${gap.phc_code}`,
          facilityCode: gap.phc_code,
          facilityName: gap.phc_code,
          issue: `Zero Doctor Day Flag triggered`,
          severity: 'critical',
          timestamp: 'Just now'
        });
      }
    });
  });

  clinicalFindings.medicine_findings?.forEach((mf: any) => {
    (mf.critical_shortages || []).forEach((sh: any) => {
      critical_alerts.push({
        id: `MED-${sh.phc_code}-${sh.medicine_name}`,
        facilityCode: sh.phc_code,
        facilityName: sh.phc_code,
        issue: `${sh.medicine_name} Stockout Warning (${Math.round(sh.days_remaining)} days)`,
        severity: 'critical',
        timestamp: 'Just now'
      });
    });
  });

  // Calculate resource health scores
  let paracetamolCount = 0, paracetamolSafe = 0;
  let amoxicillinCount = 0, amoxicillinSafe = 0;
  let metforminCount = 0, metforminSafe = 0;

  clinicalFindings.medicine_findings?.forEach((mf: any) => {
    Object.values(mf.inventory_by_phc || {}).forEach((items: any) => {
      items.forEach((item: any) => {
        if (item.medicine_name === 'Paracetamol') { paracetamolCount++; if (item.status !== 'CRITICAL') paracetamolSafe++; }
        if (item.medicine_name === 'Amoxicillin') { amoxicillinCount++; if (item.status !== 'CRITICAL') amoxicillinSafe++; }
        if (item.medicine_name === 'Metformin') { metforminCount++; if (item.status !== 'CRITICAL') metforminSafe++; }
      });
    });
  });

  let labFullyFunctional = 0;
  let totalLabs = 0;
  clinicalFindings.lab_findings?.forEach((lf: any) => {
    Object.values(lf.lab_status_by_phc || {}).forEach((status: any) => {
      totalLabs++;
      if (status.audit_text === 'Fully Functional' || status.coverage_pct === 100) {
        labFullyFunctional++;
      }
    });
  });

  const getScore = (safe: number, total: number) => total > 0 ? Math.round((safe / total) * 100) : 0;
  
  const resource_health = [
    { label: "Paracetamol Supply", value: getScore(paracetamolSafe, paracetamolCount), tone: getScore(paracetamolSafe, paracetamolCount) < 50 ? 'critical' : 'low' },
    { label: "Amoxicillin Supply", value: getScore(amoxicillinSafe, amoxicillinCount), tone: getScore(amoxicillinSafe, amoxicillinCount) < 50 ? 'critical' : 'low' },
    { label: "Metformin Supply", value: getScore(metforminSafe, metforminCount), tone: getScore(metforminSafe, metforminCount) < 50 ? 'critical' : 'low' },
    { label: "Lab Availability", value: getScore(labFullyFunctional, totalLabs), tone: getScore(labFullyFunctional, totalLabs) < 50 ? 'critical' : 'medium' }
  ];

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Operations Overview</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Real-time district health intelligence & risk assessment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Facilities" value={kpis.total_phcs} icon={Activity} colorClass="text-blue-400" />
        <MetricCard label="Population Covered" value={kpis.population_covered} icon={Users} colorClass="text-purple-400" />
        <MetricCard label="Today's Footfall" value={kpis.todays_footfall} trend={kpis.footfall_trend} icon={UserCheck} colorClass="text-green-400" />
        <MetricCard label="Critical Risk Score" value={riskScore} trend="+5 pts" icon={AlertTriangle} colorClass="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="text-[var(--color-status-critical)]" size={20} /> 
              Active Alerts
            </h3>
            <div className="space-y-3">
              {critical_alerts.length > 0 ? critical_alerts.map((alert: any, i: number) => (
                <AlertCard key={i} alert={alert} />
              )) : <p className="text-sm text-[var(--color-text-secondary)]">No critical alerts at this time.</p>}
            </div>
          </div>
          
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4 text-[var(--color-text-primary)]">AI Executive Summary</h3>
            <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-sidebar)] p-4 rounded-lg border border-[var(--color-border-subtle)]">
              {operationalPlan.summary || "Analysis complete. Review findings."}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4">Resource Health Matrix</h3>
            <div className="space-y-5">
              {resource_health.map((rh: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[var(--color-text-secondary)] font-medium">{rh.label}</span>
                    <span className={`font-semibold ${rh.tone === 'critical' ? 'text-[var(--color-status-critical)]' : rh.tone === 'low' ? 'text-[var(--color-status-low)]' : 'text-[var(--color-status-medium)]'}`}>{rh.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--color-bg-sidebar)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
                    <div className={`h-full rounded-full ${rh.tone === 'critical' ? 'bg-[var(--color-status-critical)]' : rh.tone === 'low' ? 'bg-[var(--color-status-low)]' : 'bg-[var(--color-status-medium)]'}`} style={{ width: `${rh.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
