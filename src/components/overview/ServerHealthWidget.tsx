import React from 'react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/common/Badge';
import { Server, Activity, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';

export const ServerHealthWidget: React.FC = () => {
  const { servers, setSelectedServerId, setActivePage } = useApp();

  return (
    <div className="hud-bracket soc-card p-4.5 bg-background-surface/90 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text flex items-center gap-2">
            Target Assets Telemetry
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sentra-green/15 text-sentra-green border border-sentra-green/30 font-bold">
              {servers.filter(s => s.monitoringStatus === 'active').length} ACTIVE
            </span>
          </h3>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">
            Authorized network endpoints monitored via unidirectional telemetry feeds
          </p>
        </div>

        <button
          onClick={() => setActivePage('servers')}
          className="text-xs font-mono uppercase tracking-wider text-sentra-cyan hover:text-white font-medium flex items-center gap-1 hover:underline transition-colors"
        >
          <span>Manage Assets ({servers.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {servers.slice(0, 6).map((server) => (
          <div
            key={server.id}
            onClick={() => {
              setSelectedServerId(server.id);
              setActivePage('servers');
            }}
            className="p-3 rounded bg-background-card border border-border hover:border-sentra-cyan/50 hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="overflow-hidden pr-2">
                <div className="text-xs font-mono font-bold text-text group-hover:text-sentra-cyan transition-colors truncate">
                  {server.name}
                </div>
                <div className="text-[10px] font-mono text-text-muted mt-0.5">
                  {server.ipAddress}
                </div>
              </div>
              <Badge status={server.monitoringStatus}>
                {server.monitoringStatus}
              </Badge>
            </div>

            <div className="mt-3 pt-2 border-t border-border/80 grid grid-cols-3 gap-1 text-[10px] font-mono text-text-muted">
              <div>
                <span className="text-text-muted/70 block text-[8px] uppercase tracking-wider">Bandwidth</span>
                <span className="text-text font-bold">{server.stats.bandwidthMbps} Mbps</span>
              </div>
              <div>
                <span className="text-text-muted/70 block text-[8px] uppercase tracking-wider">Packets</span>
                <span className="text-text font-bold">{server.stats.packetsProcessed}</span>
              </div>
              <div>
                <span className="text-text-muted/70 block text-[8px] uppercase tracking-wider">Threats</span>
                <span className={`font-bold ${server.activeThreats > 0 ? 'text-sentra-danger' : 'text-sentra-green'}`}>
                  {server.activeThreats > 0 ? `${server.activeThreats} active` : 'CLEAN'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
