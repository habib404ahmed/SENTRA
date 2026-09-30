import React from 'react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/common/Badge';
import { Server, Activity, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';

export const ServerHealthWidget: React.FC = () => {
  const { servers, setSelectedServerId, setActivePage } = useApp();

  return (
    <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
            Monitored Asset Health
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {servers.filter(s => s.monitoringStatus === 'active').length} Active
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Authorized network endpoints monitored via unidirectional telemetry
          </p>
        </div>

        <button
          onClick={() => setActivePage('servers')}
          className="text-xs text-sentra-cyan hover:text-sentra-sky font-medium flex items-center gap-1 hover:underline"
        >
          Manage All ({servers.length})
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
            className="p-3.5 rounded-lg bg-background-card border border-border/80 hover:border-slate-600 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="overflow-hidden pr-2">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-sentra-cyan transition-colors truncate">
                  {server.name}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {server.ipAddress}
                </div>
              </div>
              <Badge status={server.monitoringStatus}>
                {server.monitoringStatus}
              </Badge>
            </div>

            <div className="mt-3 pt-2.5 border-t border-border/50 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-400">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Bandwidth</span>
                <span className="text-slate-200 font-semibold">{server.stats.bandwidthMbps} Mbps</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Packets</span>
                <span className="text-slate-200 font-semibold">{server.stats.packetsProcessed}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Threats</span>
                <span className={`font-semibold ${server.activeThreats > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {server.activeThreats > 0 ? `${server.activeThreats} active` : 'Clean'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
