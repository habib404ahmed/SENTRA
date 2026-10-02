import React from 'react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/common/Badge';
import { ExternalLink, ArrowRight } from 'lucide-react';

export const RecentAlertsTable: React.FC = () => {
  const { alerts, setSelectedAlertId, setActivePage } = useApp();
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="hud-bracket soc-card p-4.5 bg-background-surface/90 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text flex items-center gap-2">
            Recent Security Incidents
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sentra-danger/15 text-sentra-danger border border-sentra-danger/30 font-bold">
              LIVE INGRESS
            </span>
          </h3>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">
            Real-time threat classifications ordered by telemetry capture timestamp
          </p>
        </div>

        <button
          onClick={() => setActivePage('alerts')}
          className="text-xs font-mono uppercase tracking-wider text-sentra-cyan hover:text-white font-medium flex items-center gap-1 hover:underline transition-colors"
        >
          <span>View All ({alerts.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-text-muted uppercase tracking-wider text-[10px] font-mono bg-background/50">
              <th className="py-2.5 px-3 font-medium">Severity</th>
              <th className="py-2.5 px-3 font-medium">Threat Category</th>
              <th className="py-2.5 px-3 font-medium">Observed Source IP</th>
              <th className="py-2.5 px-3 font-medium">Destination</th>
              <th className="py-2.5 px-3 font-medium">Asset / Server</th>
              <th className="py-2.5 px-3 font-medium">Model Score</th>
              <th className="py-2.5 px-3 font-medium">Time (UTC)</th>
              <th className="py-2.5 px-3 font-medium">Status</th>
              <th className="py-2.5 px-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {recentAlerts.map((alert) => (
              <tr 
                key={alert.id}
                className="hover:bg-background-card/60 transition-colors group cursor-pointer"
                onClick={() => setSelectedAlertId(alert.id)}
              >
                <td className="py-2.5 px-3">
                  <Badge severity={alert.severity}>{alert.severity}</Badge>
                </td>
                <td className="py-2.5 px-3 font-medium text-text group-hover:text-sentra-cyan transition-colors">
                  <div className="flex flex-col">
                    <span className="font-semibold">{alert.threat}</span>
                    <span className="text-[9px] font-mono text-text-muted">{alert.id}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 font-mono text-text">
                  <span className="bg-background px-1.5 py-0.5 rounded border border-border text-sentra-danger/90">
                    {alert.sourceIp}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono text-text-muted text-[11px]">
                  {alert.destinationIp}:{alert.destinationPort}
                </td>
                <td className="py-2.5 px-3 text-text">
                  <span className="truncate max-w-[130px] block font-mono text-[11px]" title={alert.serverName}>
                    {alert.serverName}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono">
                  <span className={`font-bold ${
                    alert.modelScore >= 90 ? 'text-sentra-critical' : 'text-sentra-amber'
                  }`}>
                    {alert.modelScore}%
                  </span>
                </td>
                <td className="py-2.5 px-3 text-text-muted font-mono text-[11px] whitespace-nowrap">
                  {alert.detectedAt.split(' ')[1] || alert.detectedAt}
                </td>
                <td className="py-2.5 px-3">
                  <Badge status={alert.status}>{alert.status}</Badge>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlertId(alert.id);
                    }}
                    className="p-1 rounded text-text-muted hover:text-sentra-cyan hover:bg-background transition-colors"
                    title="Examine incident details & evidence"
                    aria-label="Examine incident details"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
