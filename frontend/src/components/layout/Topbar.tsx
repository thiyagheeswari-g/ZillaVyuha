import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Menu, Search, Bell, User, CheckCircle2, Clock } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
export const Topbar = () => {
  const { toggleSidebar, notifications, unreadNotificationCount, markAllNotificationsRead, markNotificationRead, clinicalFindings } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedState, setSelectedState] = useState('Tamil Nadu');
  const [selectedDistrict, setSelectedDistrict] = useState('Chengalpattu');

  // Dynamically extract districts from AI pipeline if available
  const dynamicDistricts = new Set<string>();
  if (clinicalFindings?.footfall_findings) {
    clinicalFindings.footfall_findings.forEach((ff: any) => {
      Object.values(ff.footfall_by_phc || {}).forEach((info: any) => {
        if (info.district) dynamicDistricts.add(info.district);
      });
    });
  }
  
  const STATES: Record<string, string[]> = {
    'Tamil Nadu': dynamicDistricts.size > 0 ? Array.from(dynamicDistricts) : ['Chengalpattu', 'Coimbatore', 'Madurai', 'Salem', 'Thanjavur', 'Tirunelveli'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur']
  };

  useEffect(() => {
    if (dynamicDistricts.size > 0 && !STATES['Tamil Nadu'].includes(selectedDistrict)) {
      setSelectedDistrict(STATES['Tamil Nadu'][0]);
    }
  }, [dynamicDistricts.size]);

  return (
    <header className="h-16 bg-[var(--color-bg-app)] border-b border-[var(--color-border-subtle)] flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-6">
        <button onClick={toggleSidebar} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Tamil Nadu State Health Dashboard</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 relative">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input 
            type="text" 
            placeholder="Search resources, PHCs..." 
            className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border-subtle)] rounded-full pl-9 pr-4 py-1.5 text-sm w-64 focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
            onChange={(e) => {
              const val = e.target.value;
              if (val.length > 2) {
                const results = document.getElementById('search-results');
                if (results) results.classList.remove('hidden');
              } else {
                const results = document.getElementById('search-results');
                if (results) results.classList.add('hidden');
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                const results = document.getElementById('search-results');
                if (results) results.classList.add('hidden');
              }, 200);
            }}
          />
          <div id="search-results" className="hidden absolute top-full mt-2 w-full bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg shadow-lg overflow-hidden z-50">
            <div className="p-2 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-sidebar)] cursor-pointer transition-colors">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">PHC-07 Sendurai</div>
              <div className="text-xs text-[var(--color-text-muted)]">Facility • Critical Risk</div>
            </div>
            <div className="p-2 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-sidebar)] cursor-pointer transition-colors">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">Amoxicillin 500mg</div>
              <div className="text-xs text-[var(--color-text-muted)]">Resource • High Shortage</div>
            </div>
            <div className="p-2 hover:bg-[var(--color-bg-sidebar)] cursor-pointer transition-colors">
              <div className="text-sm text-[var(--color-accent-blue)]">View all results</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative text-[var(--color-text-secondary)] hover:text-white transition-colors p-1 rounded-full ${showNotifications ? 'bg-[var(--color-bg-sidebar)] text-white' : ''}`}
            >
              <Bell size={20} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-0 -right-0 w-2.5 h-2.5 bg-[var(--color-status-critical)] rounded-full border-2 border-[var(--color-bg-app)]"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sidebar)]">
                  <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">Notifications</h3>
                  {unreadNotificationCount > 0 && (
                    <button onClick={markAllNotificationsRead} className="text-xs text-[var(--color-accent-blue)] hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => !n.isRead && markNotificationRead(n.id)}
                        className={`p-4 border-b border-[var(--color-border-subtle)] last:border-0 cursor-pointer transition-colors ${!n.isRead ? 'bg-[var(--color-bg-sidebar)]/50' : 'hover:bg-[var(--color-bg-sidebar)]/30'}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 shrink-0 ${!n.isRead ? 'text-[var(--color-accent-blue)]' : 'text-[var(--color-text-muted)]'}`}>
                            {!n.isRead ? <span className="w-2 h-2 rounded-full bg-[var(--color-accent-blue)] block mt-1.5" /> : <CheckCircle2 size={14} />}
                          </div>
                          <div>
                            <p className={`text-sm ${!n.isRead ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>{n.message}</p>
                            <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                              <Clock size={10} /> {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 border-l border-[var(--color-border-subtle)] pl-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">Thiya</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">District Health Officer</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent-blue)] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-white/10">
              T
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};