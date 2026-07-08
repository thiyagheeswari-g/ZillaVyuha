import React, { useState, useEffect } from 'react';
import { PieChart as PieChartIcon, Activity } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';

export const Analytics = () => {
  const [tab, setTab] = useState('Medicine');
  const { activeFlowId, clinicalFindings: data } = useStore();
  const { t } = useTranslation();

  // Transform data for charts
  const medicineData: any[] = [];
  data?.medicine_findings?.forEach((mf: any) => {
    Object.entries(mf.inventory_by_phc || {}).forEach(([phc, items]: any) => {
      items.forEach((i: any) => {
        medicineData.push({
          name: `${i.medicine_name} (${phc})`,
          stock: i.current_stock,
          minimum: i.avg_daily_consumption * 5
        });
      });
    });
  });

  const footfallData: any[] = [];
  data?.footfall_findings?.forEach((ff: any) => {
    Object.entries(ff.footfall_by_phc || {}).forEach(([phc, info]: any) => {
      footfallData.push({
        name: phc,
        count: info.today_count,
        capacity: info.capacity
      });
    });
  });

  const bedsData: any[] = [];
  data?.bed_findings?.forEach((bf: any) => {
    Object.entries(bf.bed_status_by_chc || {}).forEach(([chc, info]: any) => {
      bedsData.push({
        name: chc,
        total: info.total_beds,
        occupied: info.occupied
      });
    });
  });

  const attendanceData: any[] = [];
  data?.attendance_findings?.forEach((af: any) => {
    Object.entries(af.attendance_by_phc || {}).forEach(([phc, info]: any) => {
      attendanceData.push({
        name: phc,
        present: info.present,
        absent: info.absent
      });
    });
  });

  return (
    <div className="max-w-6xl mx-auto py-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <PieChartIcon className="text-[var(--color-accent-blue)]" /> {t('sidebar.analytics', 'Analytics')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('ui.deepDive', 'Deep dive into operational metrics across the district.')}</p>
        </div>
      </div>

      <div className="flex bg-[var(--color-bg-sidebar)] p-1 rounded-lg border border-[var(--color-border-subtle)] w-fit mb-8">
        {['Medicine', 'Attendance', 'Beds', 'Footfall'].map(tStr => (
          <button 
            key={tStr}
            onClick={() => setTab(tStr)} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === tStr ? 'bg-[var(--color-bg-card)] text-white shadow' : 'text-[var(--color-text-secondary)] hover:text-white'}`}
          >
            {t(`ui.${tStr.toLowerCase()}`, tStr)}
          </button>
        ))}
      </div>

      {!activeFlowId ? (
         <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] italic border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl">
           {t('ui.noData', 'Please upload data and run the pipeline to view analytics.')}
         </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6 rounded-xl shadow-sm flex-1 min-h-[400px]">
          <h3 className="font-semibold text-lg text-[var(--color-text-primary)] mb-6">
            {t(`ui.${tab.toLowerCase()}`, tab)} {t('ui.overview', 'Overview')}
          </h3>
          <div className="h-[400px] w-full">
            {tab === 'Medicine' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={medicineData.length ? medicineData : [{name: 'No Data', stock: 0, minimum: 0}]} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'var(--color-bg-sidebar)'}}
                    contentStyle={{ backgroundColor: 'var(--color-bg-sidebar)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="stock" name="Current Stock" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="minimum" name="Minimum Required" fill="var(--color-status-critical)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {tab === 'Footfall' && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={footfallData.length ? footfallData : [{name: 'No Data', count: 0, capacity: 0}]} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'var(--color-bg-sidebar)'}}
                    contentStyle={{ backgroundColor: 'var(--color-bg-sidebar)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="count" name="Today's Footfall" fill="var(--color-status-low)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="capacity" name="Capacity" stroke="var(--color-status-critical)" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}

            {tab === 'Beds' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bedsData.length ? bedsData : [{name: 'No Data', occupied: 0, total: 0}]} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'var(--color-bg-sidebar)'}} contentStyle={{ backgroundColor: 'var(--color-bg-sidebar)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }} />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="occupied" stackId="a" name="Occupied Beds" fill="var(--color-status-critical)" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="total" stackId="a" name="Available Capacity" fill="var(--color-accent-green)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {tab === 'Attendance' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData.length ? attendanceData : [{name: 'No Data', present: 0, absent: 0}]} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'var(--color-bg-sidebar)'}} contentStyle={{ backgroundColor: 'var(--color-bg-sidebar)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }} />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="present" name="Present" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="var(--color-status-critical)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
