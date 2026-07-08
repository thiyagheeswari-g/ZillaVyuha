import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, User, Globe, Moon, Sun, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Settings = () => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useStore();

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <SettingsIcon className="text-[var(--color-accent-blue)]" /> {t('settings.title')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sidebar)] flex items-center gap-2">
            <User size={18} className="text-[var(--color-text-secondary)]"/>
            <h3 className="font-semibold text-[var(--color-text-primary)]">User Profile</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-6 items-center border-b border-[var(--color-border-subtle)] pb-6">
              <div className="w-16 h-16 rounded-full bg-[var(--color-accent-blue)] text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-sm border border-white/10">
                T
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Display Name</label>
                <input type="text" defaultValue="Thiya" className="w-full sm:w-1/2 px-4 py-2 bg-[var(--color-bg-sidebar)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-blue)]" />
              </div>
            </div>
            <div>
               <label className="block text-xs text-[var(--color-text-muted)] mb-1">Role</label>
               <input type="text" defaultValue="District Health Officer" disabled className="w-full sm:w-1/2 px-4 py-2 bg-[var(--color-bg-sidebar)]/50 border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text-muted)] cursor-not-allowed" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sidebar)] flex items-center gap-2">
            <Globe size={18} className="text-[var(--color-text-secondary)]"/>
            <h3 className="font-semibold text-[var(--color-text-primary)]">Preferences</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
               <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('settings.language')}</label>
               <select 
                 value={language}
                 onChange={(e: any) => {
                   setLanguage(e.target.value);
                   i18n.changeLanguage(e.target.value);
                 }}
                 className="w-full sm:w-1/2 px-4 py-2 bg-[var(--color-bg-sidebar)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-blue)]"
               >
                 <option value="en">English (US)</option>
                 <option value="hi">Hindi</option>
                 <option value="ta">Tamil</option>
               </select>
            </div>
            
            <div className="pt-4 border-t border-[var(--color-border-subtle)]">
               <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('settings.theme')}</label>
               <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setTheme('dark')}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${theme === 'dark' ? 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sidebar)]'}`}
                 >
                   <Moon size={16}/> Dark Mode
                 </button>
                 <button 
                   onClick={() => setTheme('light')}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${theme === 'light' ? 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sidebar)]'}`}
                 >
                   <Sun size={16}/> Light Mode
                 </button>
               </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button className="px-6 py-2 bg-accent-gradient text-white font-medium rounded-lg shadow-sm hover:opacity-90">
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
