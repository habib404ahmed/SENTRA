import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/common/StatCard';
import { ThreatTimelineChart, ThreatTimelinePoint } from '@/components/overview/ThreatTimelineChart';
import { ThreatDistributionChart, ThreatDistributionItem } from '@/components/overview/ThreatDistributionChart';
import { RecentAlertsTable } from '@/components/overview/RecentAlertsTable';
import { ServerHealthWidget } from '@/components/overview/ServerHealthWidget';
import { DetectionActivityFeed } from '@/components/overview/DetectionActivityFeed';
import { 
  Server, 
  ShieldAlert, 
  Activity, 
  Zap, 
  Cpu, 
  Radio, 
  RotateCw,
  Clock
} from 'lucide-react';
import { ingestionApi } from '@/services/ingestion';
import { flowsApi } from '@/services/flows';
import { mlApi } from '@/services/ml';
import { sentraApi } from '@/services/api';

export const OverviewPage: React.FC = () => {
  const { servers, alerts, refreshAllData, setActivePage } = useApp();

  const [ingestionStats, setIngestionStats] = useState<{
    totalFlows: number;
    totalPackets: number;
    totalImports: number;
  } | null>(null);

  const [threatDistribution, setThreatDistribution] = useState<ThreatDistributionItem[]>([]);
  const [threatTimeline, setThreatTimeline] = useState<ThreatTimelinePoint[]>([]);
  const [modelHealth, setModelHealth] = useState<{
    value: string;
    label: string;
    isTrained: boolean;
  }>({
    value: 'No Model',
    label: 'Awaiting Training',
    isTrained: false
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const loadDashboardData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch Ingestion and Flow statistics
      const [importsRes, flowsRes] = await Promise.all([
        ingestionApi.getImports({ limit: 100 }).catch(() => null),
        flowsApi.getFlows({ limit: 1 }).catch(() => null)
      ]);

      if (flowsRes || importsRes) {
        const pkts = importsRes?.items?.reduce((sum, item) => sum + (item.total_packets || 0), 0) || 0;
        setIngestionStats({
          totalImports: importsRes?.total || 0,
          totalPackets: pkts,
          totalFlows: flowsRes?.total || 0
        });
      }

      // 2. Fetch real Threat Distribution
      const dist = await sentraApi.getThreatDistribution();
      setThreatDistribution(dist);

      // 3. Fetch real Traffic / Alert Timeline
      const timeline = await sentraApi.getTrafficHistory();
      setThreatTimeline(timeline);

      // 4. Fetch real AI/ML Model Registry status
      try {
        const modelsRes = await mlApi.getModels();
        if (modelsRes && modelsRes.items && modelsRes.items.length > 0) {
          const activeModel = modelsRes.items[0];
          try {
            const evalRes = await mlApi.getModelEvaluation(activeModel.id);
            if (evalRes && evalRes.metrics) {
              const m = evalRes.metrics;
              const f1 = m.macro_f1 != null ? m.macro_f1 : (m.f1_score != null ? m.f1_score : m.accuracy);
              const score = f1 != null ? `${(f1 * 100).toFixed(1)}%` : 'Evaluated';
              setModelHealth({
                value: score,
                label: `${activeModel.algorithm || 'Model'} (${activeModel.version})`,
                isTrained: true
              });
            } else {
              setModelHealth({
                value: 'Registered',
                label: activeModel.name || activeModel.version,
                isTrained: true
              });
            }
          } catch {
            setModelHealth({
              value: 'Registered',
              label: activeModel.name || activeModel.version,
              isTrained: true
            });
          }
        } else {
          setModelHealth({
            value: 'No Model',
            label: 'No Trained Baseline',
            isTrained: false
          });
        }
      } catch {
        setModelHealth({
          value: 'Offline',
          label: 'Service Standby',
          isTrained: false
        });
      }

      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString([], { hour12: false }) + ' UTC');
    } catch (err) {
      console.error('Error synchronizing dashboard data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial load and periodic refresh (every 30 seconds)
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleManualSync = async () => {
    await Promise.all([
      refreshAllData(),
      loadDashboardData()
    ]);
  };

  const activeThreats = alerts.filter(a => a.status === 'active' || a.status === 'new' || a.status === 'investigating');
  const criticalThreats = activeThreats.filter(a => a.severity === 'critical');

  return (
    <div className="space-y-4">
      {/* Operations Banner */}
      <div className="soc-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-sentra-cyan/10 border border-sentra-cyan/30 text-sentra-cyan shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Security Operations Overview
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sentra-green/15 text-sentra-green border border-sentra-green/30 font-semibold">
                LIVE
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Passive optical tap: <strong className="text-sentra-cyan">eth0 (10GbE Simplex)</strong> — zero return-path emissions
            </p>
          </div>
        </div>

        {/* Sync Status & Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {lastSyncTime && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border text-slate-400 text-[11px]">
              <Clock className="w-3 h-3 text-sentra-cyan" />
              <span>Synced: <strong className="text-slate-200">{lastSyncTime}</strong></span>
            </div>
          )}

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-border hover:border-sentra-cyan text-slate-400 hover:text-sentra-cyan transition-colors disabled:opacity-50 text-xs"
            title="Manual telemetry refresh"
          >
            <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-sentra-cyan' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-sentra-green/25">
            <span className="w-2 h-2 rounded-full bg-sentra-green animate-pulse" />
            <span className="text-[11px] text-sentra-green font-semibold">Diode Active</span>
          </div>
        </div>
      </div>

      {/* Top 5 Command KPI Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* KPI 1: Monitored Assets */}
        <StatCard
          title="Monitored Assets"
          value={servers.length}
          trendText={servers.length > 0 ? `${servers.length} Registered Targets` : 'No Targets Registered'}
          trendDirection={servers.length > 0 ? 'up' : 'neutral'}
          icon={<Server className="w-4 h-4" />}
          badgeText="PostgreSQL"
          badgeVariant={servers.length > 0 ? 'low' : 'info'}
        />

        {/* KPI 2: Traffic Flows Processed */}
        <StatCard
          title="Traffic Flows"
          value={ingestionStats && ingestionStats.totalFlows > 0 ? `${ingestionStats.totalFlows.toLocaleString()}` : '0 Flows'}
          trendText={ingestionStats && ingestionStats.totalFlows > 0 ? `${ingestionStats.totalPackets.toLocaleString()} Pkts Ingested` : 'Awaiting PCAP Ingestion'}
          trendDirection="neutral"
          icon={<Activity className="w-4 h-4 text-sentra-cyan" />}
          badgeText={ingestionStats && ingestionStats.totalFlows > 0 ? 'Ingested' : 'Standby'}
          badgeVariant={ingestionStats && ingestionStats.totalFlows > 0 ? 'low' : 'info'}
        />

        {/* KPI 3: Threat Alerts */}
        <StatCard
          title="Threat Alerts"
          value={activeThreats.length}
          trendText={`${alerts.length} Total Registered`}
          trendDirection="neutral"
          icon={<ShieldAlert className="w-4 h-4 text-sentra-danger" />}
          badgeText="Queue Active"
          badgeVariant={activeThreats.length > 0 ? 'high' : 'low'}
        />

        {/* KPI 4: Critical Alerts */}
        <StatCard
          title="Critical Alerts"
          value={criticalThreats.length}
          trendText={criticalThreats.length > 0 ? 'Immediate Action' : 'Zero Critical Spill'}
          trendDirection={criticalThreats.length > 0 ? 'down' : 'neutral'}
          icon={<Zap className="w-4 h-4 text-sentra-critical" />}
          badgeText={criticalThreats.length > 0 ? 'P1 CRITICAL' : 'NOMINAL'}
          badgeVariant={criticalThreats.length > 0 ? 'critical' : 'low'}
        />

        {/* KPI 5: Model Health / Detection */}
        <div 
          onClick={() => setActivePage('models')} 
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Click to view AI/ML model registry and training pipeline"
        >
          <StatCard
            title="Model Health"
            value={modelHealth.value}
            trendText={modelHealth.label}
            trendDirection="neutral"
            icon={<Cpu className="w-4 h-4 text-sentra-cyan" />}
            badgeText={modelHealth.isTrained ? 'Trained' : 'No Model'}
            badgeVariant={modelHealth.isTrained ? 'low' : 'info'}
          />
        </div>
      </div>

      {/* Middle Row: Threat Timeline & Threat Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ThreatTimelineChart data={threatTimeline} isLoading={isSyncing} />
        </div>
        <div>
          <ThreatDistributionChart data={threatDistribution} isLoading={isSyncing} />
        </div>
      </div>

      {/* Recent Alerts Incident Table */}
      <RecentAlertsTable />

      {/* Bottom Row: Server Health & Detection Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ServerHealthWidget />
        </div>
        <div>
          <DetectionActivityFeed />
        </div>
      </div>
    </div>
  );
};
