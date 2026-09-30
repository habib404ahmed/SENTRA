import { 
  MonitoredServer, 
  ThreatAlert, 
  KPIMetrics, 
  TrafficDataPoint, 
  ThreatIntelItem, 
  NotificationItem,
  AlertStatus
} from '@/types';
import { initialMockServers } from '@/data/mockServers';
import { initialMockAlerts } from '@/data/mockAlerts';
import { 
  mockKpiMetrics, 
  mockHourlyTraffic, 
  mockThreatDistribution, 
  mockProtocolDistribution, 
  mockTopSourceIps, 
  mockTopPorts 
} from '@/data/mockTraffic';
import { mockThreatCategoriesIntel, mockObservedIps } from '@/data/mockThreats';
import { initialMockNotifications } from '@/data/mockNotifications';

// In-memory frontend state mimicking backend database storage for Phase 1
let serversStore: MonitoredServer[] = [...initialMockServers];
let alertsStore: ThreatAlert[] = [...initialMockAlerts];
let notificationsStore: NotificationItem[] = [...initialMockNotifications];

// Simulated network latency helper
const delay = (ms: number = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const sentraApi = {
  // === Dashboard & KPIs ===
  async getDashboardMetrics(): Promise<KPIMetrics> {
    await delay();
    // Dynamically update active threats count based on store
    const activeCount = alertsStore.filter(a => a.status === 'active').length;
    const criticalCount = alertsStore.filter(a => a.status === 'active' && a.severity === 'critical').length;
    
    return {
      ...mockKpiMetrics,
      monitoredServers: {
        ...mockKpiMetrics.monitoredServers,
        value: serversStore.length,
      },
      activeThreats: {
        ...mockKpiMetrics.activeThreats,
        value: activeCount,
        criticalCount,
      }
    };
  },

  async getThreatDistribution() {
    await delay();
    return mockThreatDistribution;
  },

  async getTrafficHistory(): Promise<TrafficDataPoint[]> {
    await delay();
    return mockHourlyTraffic;
  },

  // === Servers Endpoints ===
  async getServers(): Promise<MonitoredServer[]> {
    await delay();
    return [...serversStore];
  },

  async getServerById(id: string): Promise<MonitoredServer | undefined> {
    await delay();
    return serversStore.find(s => s.id === id);
  },

  async createServer(serverData: Omit<MonitoredServer, 'id' | 'stats' | 'lastActivity' | 'activeThreats'>): Promise<MonitoredServer> {
    await delay();
    const newServer: MonitoredServer = {
      ...serverData,
      id: `srv-${String(serversStore.length + 1).padStart(3, '0')}`,
      lastActivity: 'Just now',
      activeThreats: 0,
      stats: {
        packetsProcessed: '0',
        bytesProcessed: '0 MB',
        flowCount: '0',
        connectionRate: '0/s',
        pps: 0,
        bandwidthMbps: 0,
      }
    };
    serversStore = [newServer, ...serversStore];
    return newServer;
  },

  async toggleServerMonitoring(id: string): Promise<MonitoredServer | null> {
    await delay();
    const server = serversStore.find(s => s.id === id);
    if (!server) return null;
    server.monitoringStatus = server.monitoringStatus === 'active' ? 'paused' : 'active';
    serversStore = [...serversStore];
    return { ...server };
  },

  // === Alerts Endpoints ===
  async getAlerts(): Promise<ThreatAlert[]> {
    await delay();
    return [...alertsStore];
  },

  async getAlertById(id: string): Promise<ThreatAlert | undefined> {
    await delay();
    return alertsStore.find(a => a.id === id);
  },

  async updateAlertStatus(id: string, status: AlertStatus, note?: string): Promise<ThreatAlert | null> {
    await delay();
    const alert = alertsStore.find(a => a.id === id);
    if (!alert) return null;
    alert.status = status;
    if (note) {
      alert.notes = [...(alert.notes || []), note];
    }
    alertsStore = [...alertsStore];
    return { ...alert };
  },

  // === Traffic Analytics Endpoints ===
  async getTrafficAnalytics() {
    await delay();
    return {
      hourly: mockHourlyTraffic,
      protocols: mockProtocolDistribution,
      topSources: mockTopSourceIps,
      topPorts: mockTopPorts,
    };
  },

  // === Threat Intelligence Endpoints ===
  async getThreatIntelligence() {
    await delay();
    return {
      categories: mockThreatCategoriesIntel,
      observedIps: mockObservedIps,
    };
  },

  // === Notifications Endpoints ===
  async getNotifications(): Promise<NotificationItem[]> {
    await delay();
    return [...notificationsStore];
  },

  async markNotificationRead(id: string): Promise<void> {
    await delay();
    notificationsStore = notificationsStore.map(n => n.id === id ? { ...n, read: true } : n);
  },

  async markAllNotificationsRead(): Promise<void> {
    await delay();
    notificationsStore = notificationsStore.map(n => ({ ...n, read: true }));
  }
};
