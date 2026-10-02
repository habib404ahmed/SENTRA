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

import { ingestionApi } from './ingestion';
import { flowsApi } from './flows';
import { mlApi } from './ml';

// Simulated latency helper for remaining mock modules
const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

let alertsStore: ThreatAlert[] = [];
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

  // === Dashboard & KPIs (Server count, alert statistics, flow telemetry, ML evaluation from backend) ===
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
    let totalAlerts = 0;
    try {
      const summary = await alertsApi.getAlertSummary();
      totalAlerts = summary.total_alerts || 0;
      activeCount = summary.active_alerts || 0;
      criticalCount = summary.critical_alerts || 0;
    } catch {
      activeCount = 0;
      criticalCount = 0;
      totalAlerts = 0;
    }

    let totalFlows = 0;
    let totalPackets = 0;
    try {
      const [importsRes, flowsRes] = await Promise.all([
        ingestionApi.getImports({ limit: 100 }).catch(() => null),
        flowsApi.getFlows({ limit: 1 }).catch(() => null)
      ]);
      if (flowsRes) {
        totalFlows = flowsRes.total || 0;
      }
      if (importsRes && Array.isArray(importsRes.items)) {
        totalPackets = importsRes.items.reduce((sum, item) => sum + (item.total_packets || 0), 0);
      }
    } catch {
      totalFlows = 0;
      totalPackets = 0;
    }

    // Query real trained model evaluations if available
    let modelMetricLabel = 'No Trained Model';
    let modelMetricValue = '0.0%';
    try {
      const modelsList = await mlApi.getModels();
      if (modelsList && modelsList.items && modelsList.items.length > 0) {
        const bestModel = modelsList.items[0];
        try {
          const evalRes = await mlApi.getModelEvaluation(bestModel.id);
          if (evalRes && evalRes.metrics) {
            const m = evalRes.metrics;
            const f1 = m.macro_f1 != null ? m.macro_f1 : (m.f1_score != null ? m.f1_score : m.accuracy);
            modelMetricValue = f1 != null ? `${(f1 * 100).toFixed(1)}%` : 'Evaluated';
            modelMetricLabel = `${bestModel.algorithm || 'Model'} (${bestModel.version})`;
          }
        } catch {
          modelMetricLabel = `${bestModel.algorithm || 'Model'} (${bestModel.version})`;
          modelMetricValue = 'Trained';
        }
      }
    } catch {
      // No models
    }
    
    return {
      monitoredServers: {
        value: serverCount,
        changeText: `${serverCount} Active Targets`,
        trend: serverCount > 0 ? 'up' : 'neutral',
      },
      activeThreats: {
        value: activeCount,
        criticalCount,
        changeText: `${totalAlerts} Total Registered`,
        trend: activeCount > 0 ? 'up' : 'neutral',
      },
      trafficAnalyzed: {
        value: totalFlows > 0 ? `${totalFlows.toLocaleString()} Flows` : '0 Flows',
        period: totalPackets > 0 ? `${totalPackets.toLocaleString()} Pkts` : 'Awaiting PCAP',
        rawGb: 0,
      },
      threatsDetected: {
        value: totalAlerts,
        period: 'Telemetry Ingress',
        changeText: `${activeCount} Active`,
      },
      modelMetricPlaceholder: {
        title: 'Model Health',
        f1ScoreDemo: modelMetricValue,
        baselineAccuracy: modelMetricValue,
        latencyAvg: '< 1ms',
        isDemo: modelMetricLabel === 'No Trained Model',
        note: modelMetricLabel
      }
    };
  },

  // === Threat Distribution (Pulled dynamically from PostgreSQL; returns empty if 0 alerts) ===
  async getThreatDistribution(): Promise<{ category: string; count: number; percentage: number; color: string; trend: string }[]> {
    try {
      const summary = await alertsApi.getAlertSummary();
      if (summary && summary.total_alerts > 0 && summary.by_threat_class) {
        const colors = ['#00E5FF', '#FF1744', '#FFB300', '#9C27B0', '#00E676', '#3B82F6', '#EC4899'];
        let idx = 0;
        return Object.entries(summary.by_threat_class).map(([cat, count]) => ({
          category: cat,
          count,
          percentage: Math.round((count / summary.total_alerts) * 100),
          color: colors[idx++ % colors.length],
          trend: '+0%'
        }));
      }
    } catch (err) {
      console.warn('Failed to load real threat distribution from backend:', err);
    }
    return [];
  },

  // === Traffic History Timeline (Pulled dynamically from PostgreSQL alert trend) ===
  async getTrafficHistory(): Promise<TrafficDataPoint[]> {
    try {
      const summary = await alertsApi.getAlertSummary();
      if (summary && summary.recent_trend && summary.recent_trend.length > 0) {
        return summary.recent_trend.map(t => ({
          timestamp: t.date,
          volumeGbps: 0,
          packetsPerSec: 0,
          bytesPerSec: 0,
          flowCount: 0,
          threatEvents: t.count,
        }));
      }
    } catch (err) {
      console.warn('Failed to load real traffic trend from backend:', err);
    }
    return [];
  },

  // === Alerts Endpoints (Connected to Phase 6 Threat Detection Backend) ===
  async getAlerts(): Promise<ThreatAlert[]> {
    try {
      const servers = await serversApi.getAll().catch(() => []);
      const serverNames = new Map(servers.map(s => [s.id, s.name]));

      const res = await alertsApi.getAlerts({ page_size: 100 });
      if (res && Array.isArray(res.items)) {
        const mapped = res.items.map(item =>
          mapBackendAlertToThreatAlert(item, serverNames.get(String(item.server_id)) || '')
        );
        alertsStore = mapped;
        return mapped;
      }
    } catch (err) {
      console.warn('Failed to load alerts from backend API:', err);
    }
    // Return empty array when backend has no alerts or is unreachable (never fabricate mock alerts)
    return [];
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
      console.warn(`Backend alert status update failed for #${id}:`, err);
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
