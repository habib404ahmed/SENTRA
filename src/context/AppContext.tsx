import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MonitoredServer, ThreatAlert, NotificationItem, AlertStatus } from '@/types';
import { sentraApi } from '@/services/api';

export type PageId = 
  | 'overview' 
  | 'servers' 
  | 'alerts' 
  | 'analytics' 
  | 'intelligence' 
  | 'reports' 
  | 'settings';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

interface AppContextType {
  // Navigation & Page State
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  
  // Selection states for detail modals/drawers
  selectedServerId: string | null;
  setSelectedServerId: (id: string | null) => void;
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;
  
  // Modal toggles
  isAddServerOpen: boolean;
  setIsAddServerOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  
  // Data entities
  servers: MonitoredServer[];
  alerts: ThreatAlert[];
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  loading: boolean;
  
  // Toast notifications
  toast: ToastState;
  showToast: (message: string, type?: ToastState['type']) => void;
  hideToast: () => void;
  
  // Mock Authentication
  isAuthenticated: boolean;
  login: (email?: string) => void;
  logout: () => void;
  currentUser: {
    name: string;
    role: string;
    email: string;
    clearance: string;
    avatar: string;
  };

  // State mutation actions
  addServer: (data: Omit<MonitoredServer, 'id' | 'stats' | 'lastActivity' | 'activeThreats'>) => Promise<boolean>;
  toggleServerMonitoring: (id: string) => Promise<void>;
  updateAlertStatus: (id: string, status: AlertStatus, note?: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [servers, setServers] = useState<MonitoredServer[]>([]);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default logged in for smooth preview
  const [currentUser] = useState({
    name: 'Habib Ahmed',
    role: 'Lead SOC Analyst',
    email: 'habib@sentra.sec',
    clearance: 'L3 / SIH-26145',
    avatar: 'HA'
  });

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: ToastState['type'] = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  const refreshAllData = async () => {
    try {
      setLoading(true);
      const [fetchedServers, fetchedAlerts, fetchedNotifs] = await Promise.all([
        sentraApi.getServers(),
        sentraApi.getAlerts(),
        sentraApi.getNotifications()
      ]);
      setServers(fetchedServers);
      setAlerts(fetchedAlerts);
      setNotifications(fetchedNotifs);
    } catch (err) {
      console.error('Failed to load initial data', err);
      showToast('Error loading simulated telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const addServer = async (data: Omit<MonitoredServer, 'id' | 'stats' | 'lastActivity' | 'activeThreats'>) => {
    try {
      const created = await sentraApi.createServer(data);
      setServers(prev => [created, ...prev]);
      showToast(`Asset "${created.name}" registered successfully. Unidirectional tap enabled.`, 'success');
      return true;
    } catch (err) {
      showToast('Failed to register server', 'error');
      return false;
    }
  };

  const toggleServerMonitoring = async (id: string) => {
    const updated = await sentraApi.toggleServerMonitoring(id);
    if (updated) {
      setServers(prev => prev.map(s => s.id === id ? updated : s));
      showToast(
        `Monitoring status for "${updated.name}" changed to ${updated.monitoringStatus.toUpperCase()}`,
        'info'
      );
    }
  };

  const updateAlertStatus = async (id: string, status: AlertStatus, note?: string) => {
    const updated = await sentraApi.updateAlertStatus(id, status, note);
    if (updated) {
      setAlerts(prev => prev.map(a => a.id === id ? updated : a));
      showToast(`Alert ${updated.id} status updated to ${status.toUpperCase()}`, 'success');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    await sentraApi.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = async () => {
    await sentraApi.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const login = (_email?: string) => {
    setIsAuthenticated(true);
    showToast('Authenticated as Lead SOC Analyst', 'success');
  };

  const logout = () => {
    setIsAuthenticated(false);
    showToast('Signed out of SENTRA SOC Console', 'info');
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        selectedServerId,
        setSelectedServerId,
        selectedAlertId,
        setSelectedAlertId,
        isAddServerOpen,
        setIsAddServerOpen,
        isSearchOpen,
        setIsSearchOpen,
        servers,
        alerts,
        notifications,
        unreadNotifsCount,
        loading,
        toast,
        showToast,
        hideToast,
        isAuthenticated,
        login,
        logout,
        currentUser,
        addServer,
        toggleServerMonitoring,
        updateAlertStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
