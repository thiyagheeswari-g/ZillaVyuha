import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  link?: string;
  timestamp: string;
}

interface UIStore {
  isSidebarCollapsed: boolean;
  language: 'en' | 'hi' | 'ta' | 'te';
  theme: 'dark' | 'light';
  activeFlowId: string | null;
  activeAgentDetailTab: string;
  toasts: Toast[];
  notifications: Notification[];
  unreadNotificationCount: number;
  
  // ZillaVyuha global state
  runId: string | null;
  operationalPlan: any | null;
  clinicalFindings: any | null;
  resourcePlan: any | null;
  validationResult: any | null;
  officerDecisions: any[];
  isLoading: boolean;
  
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLanguage: (lang: 'en' | 'hi' | 'ta' | 'te') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveFlowId: (flowId: string | null) => void;
  setActiveAgentDetailTab: (tab: string) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'timestamp'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleSidebar: () => void;
  
  // ZillaVyuha mutators
  setRunId: (id: string | null) => void;
  setPipelineResults: (data: Partial<UIStore>) => void;
  addOfficerDecision: (decision: any) => void;
}

export const useStore = create<UIStore>((set) => ({
  isSidebarCollapsed: false,
  language: 'en',
  theme: 'dark',
  activeFlowId: null,
  activeAgentDetailTab: 'Overview',
  toasts: [],
  
  // ZillaVyuha initial state
  runId: null,
  operationalPlan: null,
  clinicalFindings: null,
  resourcePlan: null,
  validationResult: null,
  officerDecisions: [],
  isLoading: false,
  notifications: [
    { id: 'n1', message: 'System initialized successfully.', isRead: false, timestamp: new Date().toISOString() }
  ],
  get unreadNotificationCount() {
    return this.notifications?.filter(n => !n.isRead).length || 0;
  },
  
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setLanguage: (lang) => set({ language: lang }),
  setTheme: (theme) => {
    set({ theme });
    if (theme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  },
  setActiveFlowId: (flowId) => set({ activeFlowId: flowId }),
  setActiveAgentDetailTab: (tab) => set({ activeAgentDetailTab: tab }),
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  addNotification: (notif) => {
    const id = Math.random().toString(36).substring(7);
    const newNotif = { ...notif, id, isRead: false, timestamp: new Date().toISOString() };
    set((state) => ({ notifications: [newNotif, ...state.notifications] }));
  },
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
  })),
  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true }))
  })),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  
  // ZillaVyuha mutator implementations
  setRunId: (id) => set({ runId: id }),
  setPipelineResults: (data) => set(data),
  addOfficerDecision: (decision) => set((state) => ({ 
    officerDecisions: [...state.officerDecisions, decision] 
  })),
}));

