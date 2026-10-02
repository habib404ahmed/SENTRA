import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { MonitoredServer, ThreatAlert, NotificationItem, AlertStatus } from '@/types';
import { sentraApi } from '@/services/api';
import { 
  CreateServerPayload, 
  UpdateServerPayload, 
  API_BASE_URL, 
  ConnectionDiagnosticResult, 
  checkSystemDiagnostics,
  ApiError
} from '@/services/servers';

export type PageId = 
  | 'overview' 
  | 'servers' 
  | 'ingestion'
  | 'features'
  | 'models'
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
  serversLoading: boolean;
  serversError: string | null;
  serversDiagnostic: ConnectionDiagnosticResult | null;
  isAutoReconnecting: boolean;
  autoReconnectCountdown: number;
  autoReconnectAttempt: number;
  
  // Toast notifications
  toast: ToastState;
  showToast: (message: string, type?: ToastState['type']) => void;
  hideToast: () => void;
  
  // Authentication
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
  addServer: (data: CreateServerPayload) => Promise<boolean>;
  updateServer: (id: string, data: UpdateServerPayload) => Promise<boolean>;
  deleteServer: (id: string) => Promise<boolean>;
  toggleServerMonitoring: (id: string) => Promise<void>;
  updateAlertStatus: (id: string, status: AlertStatus, note?: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  refreshServers: () => Promise<void>;
  retryConnection: () => Promise<ConnectionDiagnosticResult>;
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
  const [serversLoading, setServersLoading] = useState(false);
  const [serversError, setServersError] = useState<string | null>(null);
  const [serversDiagnostic, setServersDiagnostic] = useState<ConnectionDiagnosticResult | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info'
  });

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentUser] = useState({
    name: 'Habib Ahmed',
    role: 'Lead SOC Analyst',
    email: 'habib@sentra.sec',
    clearance: 'L3 / SIH-26145',
    avatar: 'HA'
  });

  // Automatic connection recovery state
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [autoReconnectCountdown, setAutoReconnectCountdown] = useState(0);
  const [autoReconnectAttempt, setAutoReconnectAttempt] = useState(0);

  const retryAttemptRef = useRef(0);
  const autoRetryTimeoutRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const isRecoveringRef = useRef(false);

  const clearAutoRetryTimers = useCallback(() => {
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsAutoReconnecting(false);
    setAutoReconnectCountdown(0);
  }, []);

  const scheduleAutoReconnect = useCallback(() => {
    clearAutoRetryTimers();
    if (isRecoveringRef.current) return;

    const backoffSchedule = [3, 5, 8, 12, 15];
    const attempt = retryAttemptRef.current;
    const delaySec = backoffSchedule[Math.min(attempt, backoffSchedule.length - 1)];

    setIsAutoReconnecting(true);
    setAutoReconnectAttempt(attempt + 1);
    setAutoReconnectCountdown(delaySec);

    let remaining = delaySec;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setAutoReconnectCountdown(remaining);
      if (remaining <= 0 && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 1000);

    autoRetryTimeoutRef.current = setTimeout(async () => {
      if (isRecoveringRef.current) return;
      isRecoveringRef.current = true;
      try {
        const diag = await checkSystemDiagnostics();

        if (diag.backendOnline && diag.databaseOnline) {
          clearAutoRetryTimers();
          retryAttemptRef.current = 0;
          try {
            const fetched = await sentraApi.getServers();
            setServers(fetched);
            setServersError(null);
            setServersDiagnostic(diag);
            showToast('FastAPI backend and PostgreSQL reconnected successfully!', 'success');
          } catch (fetchErr: any) {
            diag.errorKind = fetchErr instanceof ApiError ? fetchErr.kind : (fetchErr?.status === 404 ? 'endpoint_missing' : 'server_error');
            diag.statusMessage = fetchErr?.message || 'Failed to fetch servers';
            diag.technicalDetails = fetchErr?.details ? JSON.stringify(fetchErr.details) : `Endpoint error: ${fetchErr?.status || 'Unknown'}`;
            setServersDiagnostic(diag);
            setServersError(diag.statusMessage);
            retryAttemptRef.current += 1;
            scheduleAutoReconnect();
          }
        } else {
          setServersDiagnostic(diag);
          setServersError(diag.statusMessage);
          retryAttemptRef.current += 1;
          scheduleAutoReconnect();
        }
      } catch {
        retryAttemptRef.current += 1;
        scheduleAutoReconnect();
      } finally {
        isRecoveringRef.current = false;
      }
    }, delaySec * 1000);
  }, [clearAutoRetryTimers]);

  const refreshServers = async () => {
    setServersLoading(true);
    try {
      const fetched = await sentraApi.getServers();
      setServers(fetched);
      setServersError(null);
      clearAutoRetryTimers();
      retryAttemptRef.current = 0;
      setServersDiagnostic({
        backendOnline: true,
        databaseOnline: true,
        statusMessage: 'FastAPI backend and PostgreSQL database are healthy and connected.',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Failed to load monitored servers from API', err);
      const diag = await checkSystemDiagnostics();

      // If backend and database are healthy according to liveness/readiness probes,
      // but getServers failed (e.g. 404 route error), maintain backendOnline = true
      if (diag.backendOnline && diag.databaseOnline) {
        diag.errorKind = err instanceof ApiError ? err.kind : (err?.status === 404 ? 'endpoint_missing' : 'server_error');
        diag.statusMessage = err?.message || 'Failed to load monitored servers';
        diag.technicalDetails = err?.details ? JSON.stringify(err.details) : `HTTP ${err?.status || 'Error'}`;
      }

      setServersDiagnostic(diag);
      const msg = err?.message || diag.statusMessage || 'Could not connect to FastAPI / PostgreSQL backend.';
      setServersError(msg);
      showToast(msg, 'error');
      // Trigger automatic recovery countdown with backoff
      scheduleAutoReconnect();
    } finally {
      setServersLoading(false);
    }
  };

  const retryConnection = async (): Promise<ConnectionDiagnosticResult> => {
    clearAutoRetryTimers();
    setServersLoading(true);
    showToast('Diagnosing backend & database connection...', 'info');
    try {
      const diag = await checkSystemDiagnostics();
      if (diag.backendOnline && diag.databaseOnline) {
        showToast('Connectivity verified! Loading monitored servers from PostgreSQL...', 'success');
        try {
          const fetched = await sentraApi.getServers();
          setServers(fetched);
          setServersError(null);
          retryAttemptRef.current = 0;
          setServersDiagnostic(diag);
        } catch (fetchErr: any) {
          diag.errorKind = fetchErr instanceof ApiError ? fetchErr.kind : (fetchErr?.status === 404 ? 'endpoint_missing' : 'server_error');
          diag.statusMessage = fetchErr?.message || 'Failed to fetch servers';
          diag.technicalDetails = fetchErr?.details ? JSON.stringify(fetchErr.details) : undefined;
          setServersDiagnostic(diag);
          setServersError(diag.statusMessage);
          scheduleAutoReconnect();
        }
      } else {
        setServersDiagnostic(diag);
        setServersError(diag.statusMessage);
        showToast(`Diagnostic check: ${diag.statusMessage}`, 'error');
        // Continue auto-reconnecting in the background
        scheduleAutoReconnect();
      }
      return diag;
    } catch (err: any) {
      const fallback: ConnectionDiagnosticResult = {
        backendOnline: false,
        databaseOnline: false,
        errorKind: 'unknown',
        statusMessage: err?.message || 'Diagnostic connection check failed.',
        timestamp: new Date().toISOString(),
      };
      setServersDiagnostic(fallback);
      setServersError(fallback.statusMessage);
      showToast(fallback.statusMessage, 'error');
      scheduleAutoReconnect();
      return fallback;
    } finally {
      setServersLoading(false);
    }
  };

  // Immediate retry on window focus or network reconnect when in error state
  useEffect(() => {
    const handleWake = () => {
      if (serversError) {
        retryConnection();
      }
    };
    window.addEventListener('online', handleWake);
    window.addEventListener('focus', handleWake);
    return () => {
      window.removeEventListener('online', handleWake);
      window.removeEventListener('focus', handleWake);
      clearAutoRetryTimers();
    };
  }, [serversError, clearAutoRetryTimers]);


  const refreshAllData = async () => {
    try {
      setLoading(true);
      await Promise.allSettled([
        refreshServers(),
        (async () => {
          const fetchedAlerts = await sentraApi.getAlerts();
          setAlerts(fetchedAlerts);
        })(),
        (async () => {
          const fetchedNotifs = await sentraApi.getNotifications();
          setNotifications(fetchedNotifs);
        })()
      ]);
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();

    // Establish near-real-time Server-Sent Events (SSE) connection
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE_URL}/api/alerts/stream`);

      eventSource.addEventListener('new_alert', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const alertData = payload.data;
          showToast(
            `[LIVE DETECT] ${alertData.threat_class || 'Threat'} (${alertData.severity.toUpperCase()}) flagged from ${alertData.source_ip}`,
            alertData.severity === 'critical' || alertData.severity === 'high' ? 'error' : 'warning'
          );
          // Refresh alerts list dynamically
          sentraApi.getAlerts().then(setAlerts).catch(console.error);
        } catch (err) {
          console.error('SSE new_alert parse error', err);
        }
      });

      eventSource.addEventListener('status_change', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const { alert_id, new_status } = payload.data;
          setAlerts(prev =>
            prev.map(a => a.id === String(alert_id) ? { ...a, status: new_status } : a)
          );
        } catch (err) {
          console.error('SSE status_change parse error', err);
        }
      });

      eventSource.onerror = (err) => {
        // SSE automatically attempts reconnection per browser standard
        console.debug('Alerts SSE stream reconnecting...', err);
      };
    } catch (err) {
      console.warn('Could not establish SSE stream:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const addServer = async (data: CreateServerPayload): Promise<boolean> => {
    try {
      const created = await sentraApi.createServer(data);
      // Refresh list to keep in sync with PostgreSQL
      await refreshServers();
      showToast(`Asset "${created.name}" registered successfully in PostgreSQL.`, 'success');
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Failed to register server';
      showToast(msg, 'error');
      return false;
    }
  };

  const updateServer = async (id: string, data: UpdateServerPayload): Promise<boolean> => {
    try {
      const updated = await sentraApi.updateServer(id, data);
      setServers(prev => prev.map(s => s.id === id ? updated : s));
      showToast(`Asset "${updated.name}" updated successfully.`, 'success');
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Failed to update server';
      showToast(msg, 'error');
      return false;
    }
  };

  const deleteServer = async (id: string): Promise<boolean> => {
    try {
      await sentraApi.deleteServer(id);
      setServers(prev => prev.filter(s => s.id !== id));
      if (selectedServerId === id) {
        setSelectedServerId(null);
      }
      showToast('Asset deregistered and removed from database.', 'success');
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Failed to delete server';
      showToast(msg, 'error');
      return false;
    }
  };

  const toggleServerMonitoring = async (id: string) => {
    try {
      const updated = await sentraApi.toggleServerMonitoring(id);
      if (updated) {
        setServers(prev => prev.map(s => s.id === id ? updated : s));
        showToast(
          `Monitoring status for "${updated.name}" set to ${updated.monitoringStatus.toUpperCase()}`,
          'info'
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to toggle monitoring status', 'error');
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
        serversLoading,
        serversError,
        toast,
        showToast,
        hideToast,
        isAuthenticated,
        login,
        logout,
        currentUser,
        addServer,
        updateServer,
        deleteServer,
        toggleServerMonitoring,
        updateAlertStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshAllData,
        refreshServers,
        retryConnection,
        serversDiagnostic,
        isAutoReconnecting,
        autoReconnectCountdown,
        autoReconnectAttempt,
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
