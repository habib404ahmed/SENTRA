import { 
  MonitoredServer, 
  ThreatAlert, 
  KPIMetrics, 
  TrafficDataPoint, 
  NotificationItem,
  AlertStatus
} from '@/types';
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
import { serversApi, CreateServerPayload, UpdateServerPayload } from './servers';

// Simulated latency helper for remaining mock modules (Phase 3+)
const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

let alertsStore: ThreatAlert[] = [...initialMockAlerts];
let notificationsStore: NotificationItem[] = [...initialMockNotifications];

export const sentraApi = {
  // === Servers Endpoints (Connected to FastAPI + PostgreSQL) ===
  async getServers(): Promise<MonitoredServer[]> {
    return await serversApi.getAll();
  },

  async getServerById(id: string): Promise<MonitoredServer | undefined> {
    try {
      return await serversApi.getById(id);
    } catch {
      return undefined;
    }
  },

  async createServer(serverData: CreateServerPayload): Promise<MonitoredServer> {
    return await serversApi.create(serverData);
  },

  async updateServer(id: string | number, data: UpdateServerPayload): Promise<MonitoredServer> {
    return await serversApi.update(id, data);
  },

  async deleteServer(id: string | number): Promise<void> {
    await serversApi.delete(id);
  },

  async toggleServerMonitoring(id: string): Promise<MonitoredServer | null> {
    const current = await this.getServerById(id);
    if (!current) return null;
    const nextStatus = current.monitoringStatus === 'active' ? 'paused' : 'active';
    return await serversApi.update(id, { status: nextStatus });
  },

  // === Dashboard & KPIs (Server count pulled dynamically from real database) ===
  async getDashboardMetrics(): Promise<KPIMetrics> {
    let serverCount = 0;
    try {
      const liveServers = await serversApi.getAll();
      serverCount = liveServers.length;
    } catch {
      serverCount = 0;
    }

    const activeCount = alertsStore.filter(a => a.status === 'active').length;
    const criticalCount = alertsStore.filter(a => a.status === 'active' && a.severity === 'critical').length;
    
    return {
      ...mockKpiMetrics,
      monitoredServers: {
        ...mockKpiMetrics.monitoredServers,
        value: serverCount,
      },
      activeThreats: {
        ...mockKpiMetrics.activeThreats,
        value: activeCount,
        criticalCount,
      }
    };
  },

  // === Demo Data Modules (Clearly marked, pending future backend ML/stream phases) ===
  async getThreatDistribution() {
    await delay();
    return mockThreatDistribution;
  },

  async getTrafficHistory(): Promise<TrafficDataPoint[]> {
    await delay();
    return mockHourlyTraffic;
  },

  // === Alerts Endpoints (Phase 3 Demo/Scaffold Data) ===
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

  // === Traffic Analytics Endpoints (Phase 4 Demo Data) ===
  async getTrafficAnalytics() {
    await delay();
    return {
      hourly: mockHourlyTraffic,
      protocols: mockProtocolDistribution,
      topSources: mockTopSourceIps,
      topPorts: mockTopPorts,
    };
  },

  // === Threat Intelligence Endpoints (Phase 5 Demo Data) ===
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
