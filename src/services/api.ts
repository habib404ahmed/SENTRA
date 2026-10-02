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

import { alertsApi, mapBackendAlertToThreatAlert } from './alerts';

// Simulated latency helper for remaining mock modules
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

  // === Dashboard & KPIs (Server count and alert statistics pulled dynamically from PostgreSQL) ===
  async getDashboardMetrics(): Promise<KPIMetrics> {
    let serverCount = 0;
    try {
      const liveServers = await serversApi.getAll();
      serverCount = liveServers.length;
    } catch {
      serverCount = 0;
    }

    let activeCount = 0;
    let criticalCount = 0;
    try {
      const summary = await alertsApi.getAlertSummary();
      activeCount = summary.active_alerts;
      criticalCount = summary.critical_alerts;
    } catch {
      activeCount = alertsStore.filter(a => a.status === 'active' || a.status === 'new' || a.status === 'investigating').length;
      criticalCount = alertsStore.filter(a => (a.status === 'active' || a.status === 'new') && a.severity === 'critical').length;
    }
    
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

  // === Threat Distribution (Pulled dynamically from PostgreSQL if available) ===
  async getThreatDistribution() {
    try {
      const summary = await alertsApi.getAlertSummary();
      if (summary.total_alerts > 0) {
        const colors = ['#f43f5e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981'];
        let idx = 0;
        return Object.entries(summary.by_threat_class).map(([cat, count]) => ({
          category: cat as any,
          count,
          percentage: Math.round((count / summary.total_alerts) * 100),
          color: colors[idx++ % colors.length],
          trend: '+0%'
        }));
      }
    } catch {
      // Fallback
    }
    await delay();
    return mockThreatDistribution;
  },

  async getTrafficHistory(): Promise<TrafficDataPoint[]> {
    await delay();
    return mockHourlyTraffic;
  },

  // === Alerts Endpoints (Connected to Phase 6 Threat Detection Backend) ===
  async getAlerts(): Promise<ThreatAlert[]> {
    try {
      const servers = await serversApi.getAll().catch(() => []);
      const serverNames = new Map(servers.map(s => [s.id, s.name]));

      const res = await alertsApi.getAlerts({ page_size: 100 });
      if (res.items && res.items.length > 0) {
        return res.items.map(item =>
          mapBackendAlertToThreatAlert(item, serverNames.get(String(item.server_id)) || '')
        );
      }
    } catch (err) {
      console.warn('Failed to load alerts from backend API, using fallback store:', err);
    }
    return [...alertsStore];
  },

  async getAlertById(id: string): Promise<ThreatAlert | undefined> {
    try {
      const backendAlert = await alertsApi.getAlertById(id);
      return mapBackendAlertToThreatAlert(backendAlert);
    } catch {
      return alertsStore.find(a => a.id === id);
    }
  },

  async updateAlertStatus(id: string, status: AlertStatus, note?: string): Promise<ThreatAlert | null> {
    try {
      const updated = await alertsApi.updateAlertStatus(id, status, note);
      return mapBackendAlertToThreatAlert(updated);
    } catch (err) {
      console.warn(`Backend alert status update failed for #${id}, updating local store:`, err);
      const alert = alertsStore.find(a => a.id === id);
      if (!alert) return null;
      alert.status = status;
      if (note) {
        alert.notes = [...(alert.notes || []), note];
      }
      alertsStore = [...alertsStore];
      return { ...alert };
    }
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
