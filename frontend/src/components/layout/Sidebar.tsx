import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { useStore } from '../../store/useStore';
import { LayoutDashboard, UploadCloud, Network, Bell, Lightbulb, Building2, Package, LineChart, PieChart, FileText, CheckSquare, Settings } from 'lucide-react';

export const Sidebar = () => {
  const { t } = useTranslation();
  const isSidebarCollapsed = useStore(state => state.isSidebarCollapsed);
  const unreadCount = useStore(state => state.unreadNotificationCount);

  const navItems = [
    { name: t('sidebar.dashboard', 'Dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('sidebar.uploadData', 'Upload Data'), path: '/upload', icon: UploadCloud },
    { name: t('sidebar.agents', 'Multi-Agent Flow'), path: '/agent-flow', icon: Network, isLive: true },
    { name: t('sidebar.alerts', 'Alerts Center'), path: '/alerts', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { name: t('sidebar.recommendations', 'Recommendations'), path: '/recommendations', icon: Lightbulb, badge: 3 },
    { name: t('sidebar.facilities', 'Facilities'), path: '/facilities', icon: Building2 },
    { name: t('sidebar.resources', 'Resources'), path: '/resources', icon: Package },
    { name: t('sidebar.forecasts', 'Forecasts'), path: '/forecasts', icon: LineChart },
    { name: t('sidebar.analytics', 'Analytics'), path: '/analytics', icon: PieChart },
    { name: t('sidebar.reports', 'Reports'), path: '/reports', icon: FileText },
    { name: t('sidebar.approvals', 'Approvals'), path: '/approvals', icon: CheckSquare, badge: 3 },
    { name: t('sidebar.settings', 'Settings'), path: '/settings', icon: Settings },
  ];

  return (
    <div className={`flex flex-col bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-subtle)] transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="h-16 flex items-center px-4 border-b border-[var(--color-border-subtle)] shrink-0">
        <div className="w-8 h-8 rounded bg-accent-gradient flex items-center justify-center font-bold text-white shrink-0">Z</div>
        {!isSidebarCollapsed && <span className="ml-3 font-semibold text-lg tracking-tight">ZillaVyuha</span>}
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive 
                    ? 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-primary)] font-medium shadow-sm' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]'
                }`
              }
              title={isSidebarCollapsed ? item.name : undefined}
            >
              <item.icon size={20} className="shrink-0" />
              {!isSidebarCollapsed && (
                <>
                  <span className="ml-3 tracking-wide">{item.name}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto bg-[var(--color-accent-blue)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {item.isLive && (
                <span className="ml-auto text-[10px] font-bold text-[var(--color-status-low)] uppercase tracking-wider">Live</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-[var(--color-status-low)] mr-2 shrink-0 animate-pulse"></div>
          {!isSidebarCollapsed && <span className="text-xs text-[var(--color-text-muted)]">System Operational</span>}
        </div>
      </div>
    </div>
  );
};
