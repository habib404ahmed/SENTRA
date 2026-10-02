import React from 'react';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/common/StatCard';
import { ThreatTimelineChart } from '@/components/overview/ThreatTimelineChart';
import { ThreatDistributionChart } from '@/components/overview/ThreatDistributionChart';
import { RecentAlertsTable } from '@/components/overview/RecentAlertsTable';
import { ServerHealthWidget } from '@/components/overview/ServerHealthWidget';
import { DetectionActivityFeed } from '@/components/overview/DetectionActivityFeed';
import { mockKpiMetrics } from '@/data/mockTraffic';
import { 
  Server, 
  ShieldAlert, 
  Activity, 
  Zap, 
  Cpu, 
  Radio, 
  Lock,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { ingestionApi } from '@/services/ingestion';
import { flowsApi } from '@/services/flows';

export const OverviewPage: React.FC = () => {
  const { servers, alerts } = useApp();

  const [ingestionStats, setIngestionStats] = React.useState<{
    totalFlows: number;
    totalPackets: number;
    totalImports: number;
  } | null>(null);

  React.useEffect(() => {
    Promise.all([
      ingestionApi.getImports({ limit: 100 }).catch(() => null),
      flowsApi.getFlows({ limit: 1 }).catch(() => null)
    ]).then(([importsRes, flowsRes]) => {
      if (importsRes && flowsRes) {
        const pkts = importsRes.items.reduce((sum, item) => sum + (item.total_packets || 0), 0);
        setIngestionStats({
          totalImports: importsRes.total,
          totalPackets: pkts,
          totalFlows: flowsRes.total
        });
      }
    });
  }, []);

  const activeThreats = alerts.filter(a => a.status === 'active');
  const criticalThreats = activeThreats.filter(a => a.severity === 'critical');

  return (
    <div className="space-y-5">
      {/* Top Welcome / Status Alert Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-background-card via-background-surface to-background-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 font-display">
                SENTRA Live Threat Monitoring Console
              </h2>
              <Badge variant="demo">Demo Telemetry Feed</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Unidirectional ingress tap: <strong className="text-slate-200">eth0 (10GbE Simplex)</strong> • Zero return-path emissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-border">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300">DIODE LINK: LOCKED</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-border text-slate-400">
            <span>PACKET DROP:</span>
            <span className="text-emerald-400 font-bold">0.00%</span>
          </div>
        </div>
      </div>

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Monitored Servers */}
        <StatCard
          title="Monitored Servers"
          value={servers.length}
          trendText={`${servers.length} active assets`}
          trendDirection="up"
          icon={<Server className="w-5 h-5" />}
          badgeText="PostgreSQL"
          badgeVariant="low"
        />

        {/* KPI 2: Active Threats */}
        <StatCard
          title="Active Threats"
          value={activeThreats.length}
          trendText={`${criticalThreats.length} critical alerts`}
          trendDirection="down"
          icon={<ShieldAlert className="w-5 h-5 text-rose-400" />}
          badgeText="Requires Action"
          badgeVariant="critical"
        />

        {/* KPI 3: Traffic Analyzed */}
        <StatCard
          title="Traffic Analyzed"
          value={ingestionStats && ingestionStats.totalFlows > 0 ? `${ingestionStats.totalFlows} Flows` : mockKpiMetrics.trafficAnalyzed.value}
          trendText={ingestionStats && ingestionStats.totalFlows > 0 ? `${ingestionStats.totalPackets.toLocaleString()} Ingested Packets` : 'Simulated Ingress'}
          trendDirection="neutral"
          icon={<Activity className="w-5 h-5 text-sentra-cyan" />}
          badgeText={ingestionStats && ingestionStats.totalFlows > 0 ? 'Imported PCAP' : 'Demo Data'}
          badgeVariant={ingestionStats && ingestionStats.totalFlows > 0 ? 'low' : 'info'}
        />

        {/* KPI 4: Threats Detected */}
        <StatCard
          title="Threats Detected"
          value={mockKpiMetrics.threatsDetected.value}
          trendText={mockKpiMetrics.threatsDetected.changeText}
          trendDirection="up"
          icon={<Zap className="w-5 h-5 text-amber-400" />}
          badgeText="24h Window"
          badgeVariant="medium"
        />

        {/* KPI 5: Model Metric Placeholder (CLEARLY LABELED DEMO) */}
        <StatCard
          title="Model Metric"
          value={mockKpiMetrics.modelMetricPlaceholder.f1ScoreDemo}
          trendText="Offline Baseline F1"
          trendDirection="neutral"
          icon={<Cpu className="w-5 h-5 text-purple-400" />}
          isDemoPlaceholder={true}
          subtitle="Demo / Benchmark"
        />
      </div>

      {/* Middle Row: Threat Timeline & Threat Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ThreatTimelineChart />
        </div>
        <div>
          <ThreatDistributionChart />
        </div>
      </div>

      {/* Recent Alerts Table */}
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
