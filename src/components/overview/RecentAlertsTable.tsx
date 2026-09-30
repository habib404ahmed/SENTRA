import React from 'react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/common/Badge';
import { ExternalLink, ArrowRight } from 'lucide-react';

export const RecentAlertsTable: React.FC = () => {
  const { alerts, setSelectedAlertId, setActivePage } = useApp();
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
            Recent Security Incidents
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Live Ingress
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time threat classifications ordered by detection timestamp
          </p>
        </div>

        <button
          onClick={() => setActivePage('alerts')}
          className="text-xs text-sentra-cyan hover:text-sentra-sky font-medium flex items-center gap-1 hover:underline"
        >
          View All ({alerts.length})
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 text-slate-400 uppercase tracking-wider text-[10px] font-mono">
              <th className="pb-3 pr-3 font-medium">Severity</th>
              <th className="pb-3 px-3 font-medium">Threat Category</th>
              <th className="pb-3 px-3 font-medium">Observed Source IP</th>
              <th className="pb-3 px-3 font-medium">Destination</th>
              <th className="pb-3 px-3 font-medium">Asset / Server</th>
              <th className="pb-3 px-3 font-medium">Model Score</th>
              <th className="pb-3 px-3 font-medium">Time</th>
              <th className="pb-3 px-3 font-medium">Status</th>
              <th className="pb-3 pl-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {recentAlerts.map((alert) => (
              <tr 
                key={alert.id}
                className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                onClick={() => setSelectedAlertId(alert.id)}
              >
                <td className="py-3 pr-3">
                  <Badge severity={alert.severity}>{alert.severity}</Badge>
                </td>
                <td className="py-3 px-3 font-medium text-slate-200 group-hover:text-sentra-cyan transition-colors">
                  <div className="flex flex-col">
                    <span>{alert.threat}</span>
                    <span className="text-[10px] font-mono text-slate-500">{alert.id}</span>
                  </div>
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-border">
                    {alert.sourceIp}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">
                  {alert.destinationIp}:{alert.destinationPort}
                </td>
                <td className="py-3 px-3 text-slate-300">
                  <span className="truncate max-w-[130px] block" title={alert.serverName}>
                    {alert.serverName}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono">
                  <span className={`font-semibold ${
                    alert.modelScore >= 90 ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {alert.modelScore}%
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                  {alert.detectedAt.split(' ')[1]}
                </td>
                <td className="py-3 px-3">
                  <Badge status={alert.status}>{alert.status}</Badge>
                </td>
                <td className="py-3 pl-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlertId(alert.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-sentra-cyan hover:bg-slate-800 transition-colors"
                    title="Examine incident details & evidence"
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
