import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { 
  Server, 
  Search, 
  Plus, 
  Play, 
  Pause, 
  ExternalLink, 
  LayoutGrid, 
  List, 
  Activity, 
  ShieldAlert, 
  CheckCircle2,
  Filter
} from 'lucide-react';
import { ServerEnvironment, TrafficSourceType } from '@/types';

export const ServerTable: React.FC = () => {
  const { 
    servers, 
    setSelectedServerId, 
    setIsAddServerOpen, 
    toggleServerMonitoring 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedEnv, setSelectedEnv] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const filteredServers = servers.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ipAddress.includes(search) ||
      s.hostname.toLowerCase().includes(search.toLowerCase()) ||
      s.serverType.toLowerCase().includes(search.toLowerCase());

    const matchesEnv = selectedEnv === 'all' || s.environment === selectedEnv;
    const matchesSource = selectedSource === 'all' || s.trafficSource === selectedSource;
    const matchesStatus = selectedStatus === 'all' || s.monitoringStatus === selectedStatus;

    return matchesSearch && matchesEnv && matchesSource && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Control Bar: Filters & Actions */}
      <div className="soc-card p-4 bg-background-surface/90 border border-border rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, IP, hostname..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/20"
            />
          </div>

          {/* Environment Filter */}
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
            <option value="dmz">DMZ</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Traffic Sources</option>
            <option value="Optical Diode Tap">Optical Diode Tap</option>
            <option value="Mirrored Traffic">Mirrored Traffic</option>
            <option value="NetFlow">NetFlow</option>
            <option value="IPFIX">IPFIX</option>
            <option value="PCAP">PCAP</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Monitoring</option>
            <option value="paused">Paused</option>
            <option value="degraded">Degraded</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* Table / Card view toggle */}
          <div className="flex items-center bg-background-card border border-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-slate-800 text-sentra-cyan' : 'text-slate-400 hover:text-slate-200'}`}
              title="Table view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-slate-800 text-sentra-cyan' : 'text-slate-400 hover:text-slate-200'}`}
              title="Card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsAddServerOpen(true)}
          >
            Add Server
          </Button>
        </div>
      </div>

      {/* Main Server List View */}
      {viewMode === 'table' ? (
        <div className="soc-card bg-background-surface/80 border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-background-subtle/40 text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-3 px-4 font-medium">Server Name / Hostname</th>
                  <th className="py-3 px-4 font-medium">IP Address</th>
                  <th className="py-3 px-4 font-medium">Server Type</th>
                  <th className="py-3 px-4 font-medium">Environment</th>
                  <th className="py-3 px-4 font-medium">Traffic Source</th>
                  <th className="py-3 px-4 font-medium">Monitoring Status</th>
                  <th className="py-3 px-4 font-medium">Active Threats</th>
                  <th className="py-3 px-4 font-medium">Last Activity</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredServers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-slate-500">
                      No matching monitored servers found. Click "Add Server" to register one.
                    </td>
                  </tr>
                ) : (
                  filteredServers.map((server) => (
                    <tr
                      key={server.id}
                      onClick={() => setSelectedServerId(server.id)}
                      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded bg-slate-800 text-sentra-cyan">
                            <Server className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-100 group-hover:text-sentra-cyan transition-colors">
                              {server.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {server.hostname}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-border">
                          {server.ipAddress}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-[180px] truncate" title={server.serverType}>
                        {server.serverType}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge env={server.environment}>{server.environment}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-sentra-cyan">
                        {server.trafficSource}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={server.monitoringStatus}>{server.monitoringStatus}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {server.activeThreats > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            {server.activeThreats} active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Clean
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {server.lastActivity}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleServerMonitoring(server.id)}
                            className={`p-1.5 rounded transition-colors ${
                              server.monitoringStatus === 'active'
                                ? 'text-amber-400 hover:bg-amber-400/10'
                                : 'text-emerald-400 hover:bg-emerald-400/10'
                            }`}
                            title={server.monitoringStatus === 'active' ? 'Pause Monitoring' : 'Resume Monitoring'}
                          >
                            {server.monitoringStatus === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setSelectedServerId(server.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-sentra-cyan hover:bg-slate-800 transition-colors"
                            title="Inspect Console & Telemetry"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServers.map((server) => (
            <div
              key={server.id}
              onClick={() => setSelectedServerId(server.id)}
              className="soc-card p-5 bg-background-surface/80 border border-border hover:border-slate-600 rounded-xl cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded bg-slate-800 text-sentra-cyan shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge env={server.environment}>{server.environment}</Badge>
                    <Badge status={server.monitoringStatus}>{server.monitoringStatus}</Badge>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-sentra-cyan transition-colors">
                    {server.name}
                  </h4>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    {server.ipAddress} • {server.hostname}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                    {server.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60">
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono mb-3">
                  <div>
                    <span className="text-slate-500 block">Bandwidth</span>
                    <span className="text-slate-200 font-semibold">{server.stats.bandwidthMbps} Mbps</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PPS</span>
                    <span className="text-slate-200 font-semibold">{server.stats.pps}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Threats</span>
                    <span className={`font-semibold ${server.activeThreats > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {server.activeThreats}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] font-mono text-sentra-cyan">
                    {server.trafficSource}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={server.monitoringStatus === 'active' ? 'ghost' : 'success'}
                      size="sm"
                      onClick={() => toggleServerMonitoring(server.id)}
                    >
                      {server.monitoringStatus === 'active' ? 'Pause' : 'Resume'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      onClick={() => setSelectedServerId(server.id)}
                    >
                      Open
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
