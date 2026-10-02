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
    <div className="space-y-4">
      {/* Top Threat Defense Operations Banner */}
      <div className="hud-bracket p-4 bg-background-surface/90 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle cyan glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sentra-cyan/50 to-transparent" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 rounded bg-background border border-sentra-cyan/40 text-sentra-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)] shrink-0">
            <Radio className="w-5 h-5 animate-pulse text-sentra-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-mono font-bold tracking-widest text-text uppercase">
                CYBER THREAT COMMAND CENTER // SENTRA-OPS
              </h2>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sentra-green/15 text-sentra-green border border-sentra-green/30 font-bold uppercase">
                LIVE INGRESS
              </span>
            </div>
            <p className="text-[11px] font-mono text-text-muted mt-0.5">
              PASSIVE OPTICAL TAP: <strong className="text-sentra-cyan">eth0 (10GbE SIMPLEX)</strong> • ZERO RETURN-PATH EMISSIONS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono relative z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-border text-text">
            <span className="w-2 h-2 rounded-full bg-sentra-green animate-ping" />
            <span className="text-[11px] tracking-wider text-text-muted">DIODE:</span>
            <span className="text-sentra-green font-bold text-[11px]">LOCKED</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-border text-text-muted">
            <span className="text-[11px] tracking-wider">PACKET DROP:</span>
            <span className="text-sentra-green font-bold text-[11px]">0.00%</span>
          </div>
        </div>
      </div>

      {/* Top 5 Command KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: Monitored Assets */}
        <StatCard
          title="Monitored Assets"
          value={servers.length}
          trendText={`${servers.length} Active Targets`}
          trendDirection="up"
          icon={<Server className="w-4 h-4" />}
          badgeText="PostgreSQL"
          badgeVariant="low"
        />

        {/* KPI 2: Traffic Flows Processed */}
        <StatCard
          title="Traffic Flows"
          value={ingestionStats && ingestionStats.totalFlows > 0 ? `${ingestionStats.totalFlows}` : (mockKpiMetrics.trafficAnalyzed.value)}
          trendText={ingestionStats && ingestionStats.totalFlows > 0 ? `${ingestionStats.totalPackets.toLocaleString()} Pkts Parsed` : 'Telemetry Ingress'}
          trendDirection="neutral"
          icon={<Activity className="w-4 h-4 text-sentra-cyan" />}
          badgeText={ingestionStats && ingestionStats.totalFlows > 0 ? 'PCAP Ingested' : 'Telemetry'}
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
          trendText={criticalThreats.length > 0 ? 'Immediate Action' : 'No Critical Spill'}
          trendDirection={criticalThreats.length > 0 ? 'down' : 'neutral'}
          icon={<Zap className="w-4 h-4 text-sentra-critical" />}
          badgeText={criticalThreats.length > 0 ? 'P1 CRITICAL' : 'NOMINAL'}
          badgeVariant={criticalThreats.length > 0 ? 'critical' : 'low'}
        />

        {/* KPI 5: Model Health / Detection */}
        <StatCard
          title="Model Health"
          value={mockKpiMetrics.modelMetricPlaceholder.f1ScoreDemo}
          trendText="Baseline F1-Score"
          trendDirection="neutral"
          icon={<Cpu className="w-4 h-4 text-sentra-cyan" />}
          isDemoPlaceholder={true}
          badgeText="RF Baseline"
          badgeVariant="demo"
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
