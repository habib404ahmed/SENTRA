import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { 
  Server, 
  Search, 
  Plus, 
  Play, 
  Pause, 
  ExternalLink, 
  LayoutGrid, 
  List, 
  ShieldAlert, 
  CheckCircle2,
  Trash2,
  Edit2,
  RefreshCw,
  AlertTriangle,
  Database
} from 'lucide-react';
import { MonitoredServer } from '@/types';
import { EditServerModal } from './EditServerModal';

export const ServerTable: React.FC = () => {
  const { 
    servers, 
    serversLoading,
    serversError,
    serversDiagnostic,
    isAutoReconnecting,
    autoReconnectCountdown,
    autoReconnectAttempt,
    refreshServers,
    retryConnection,
    setSelectedServerId, 
    setIsAddServerOpen, 
    toggleServerMonitoring,
    deleteServer
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedEnv, setSelectedEnv] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Edit and Delete Modal State
  const [editingServer, setEditingServer] = useState<MonitoredServer | null>(null);
  const [deletingServer, setDeletingServer] = useState<MonitoredServer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!deletingServer) return;
    setIsDeleting(true);
    await deleteServer(deletingServer.id);
    setIsDeleting(false);
    setDeletingServer(null);
  };

  return (
    <div className="space-y-4">
      {/* Diagnostic Connection Status Banner if Error */}
      {serversError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-rose-300 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-rose-200">
                  {serversDiagnostic?.errorKind === 'backend_offline'
                    ? 'FastAPI Backend Service Offline:'
                    : serversDiagnostic?.errorKind === 'database_offline'
                    ? 'PostgreSQL Database Connection Warning:'
                    : serversDiagnostic?.errorKind === 'endpoint_missing'
                    ? 'Server API Route Not Found (404):'
                    : 'Backend API Connectivity Warning:'}
                </span>
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.5 rounded font-mono">
                  {serversDiagnostic?.errorKind === 'backend_offline'
                    ? 'GATEWAY OFFLINE'
                    : serversDiagnostic?.errorKind === 'database_offline'
                    ? 'POSTGRES DISCONNECTED'
                    : serversDiagnostic?.errorKind === 'endpoint_missing'
                    ? 'ROUTE 404'
                    : 'API ERROR'}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-1">
                {serversError}
              </p>
              {serversDiagnostic?.technicalDetails && (
                <p className="text-slate-400 font-mono text-[10px] mt-1 bg-slate-900/60 px-2 py-1 rounded border border-rose-500/20 inline-block">
                  Diagnostics: {serversDiagnostic.technicalDetails}
                </p>
              )}
              {isAutoReconnecting && autoReconnectCountdown > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    Auto-reconnecting in {autoReconnectCountdown}s (Attempt #{autoReconnectAttempt})
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${serversLoading ? 'animate-spin' : ''}`} />}
            onClick={() => retryConnection()}
            disabled={serversLoading}
            className="shrink-0 self-end md:self-auto"
          >
            {serversLoading ? 'Diagnosing...' : 'Retry Connection'}
          </Button>
        </div>
      )}

      {/* Control Bar: Filters & Actions */}
      <div className="soc-card p-3.5 sm:p-4 bg-background-surface/90 border border-border rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-auto min-w-[200px] flex-1 max-w-sm">
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
            className="flex-1 sm:flex-initial bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
            <option value="dmz">DMZ</option>
            <option value="Demo">Demo</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="flex-1 sm:flex-initial bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Traffic Sources</option>
            <option value="Flow Telemetry">Flow Telemetry</option>
            <option value="Optical Diode Tap">Optical Diode Tap</option>
            <option value="Mirrored Traffic">Mirrored Traffic</option>
            <option value="NetFlow">NetFlow</option>
            <option value="IPFIX">IPFIX</option>
            <option value="PCAP">PCAP</option>
            <option value="Other Authorized Flow Source">Other Authorized Flow Source</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 sm:flex-initial bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Monitoring</option>
            <option value="paused">Paused</option>
            <option value="degraded">Degraded</option>
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={() => refreshServers()}
              className={`p-1.5 rounded bg-background-card border border-border text-slate-400 hover:text-sentra-cyan transition-colors ${serversLoading ? 'animate-spin text-sentra-cyan' : ''}`}
              title="Refresh assets from PostgreSQL"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

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
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsAddServerOpen(true)}
            aria-label="Add Server"
            data-testid="table-add-server-btn"
          >
            Add Server
          </Button>
        </div>
      </div>

      {/* Main Server List View */}
      {serversLoading && servers.length === 0 ? (
        /* Loading Skeleton */
        <div className="soc-card p-12 bg-background-surface/80 border border-border rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-sentra-cyan" />
          <span>Synchronizing monitored assets with PostgreSQL database...</span>
        </div>
      ) : viewMode === 'table' ? (
        <div className="soc-card bg-background-surface/80 border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[820px] text-left text-xs">
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
                {serversError ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-lg mx-auto">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-slate-100 font-semibold text-sm">
                            {serversDiagnostic?.errorKind === 'backend_offline'
                              ? 'FastAPI Backend Service Offline'
                              : serversDiagnostic?.errorKind === 'database_offline'
                              ? 'PostgreSQL Database Connection Failure'
                              : serversDiagnostic?.errorKind === 'endpoint_missing'
                              ? 'Server API Route Not Found (404)'
                              : 'Failed to Retrieve Monitored Servers'}
                          </div>
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                            {serversError}
                          </p>
                          {serversDiagnostic?.technicalDetails && (
                            <div className="mt-2 p-2 rounded bg-slate-900 border border-rose-500/20 text-slate-300 font-mono text-[11px] text-left">
                              {serversDiagnostic.technicalDetails}
                            </div>
                          )}
                          {isAutoReconnecting && autoReconnectCountdown > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                              Auto-reconnecting in {autoReconnectCountdown}s (Attempt #{autoReconnectAttempt})...
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<RefreshCw className={`w-3.5 h-3.5 ${serversLoading ? 'animate-spin' : ''}`} />}
                            onClick={() => retryConnection()}
                            disabled={serversLoading}
                          >
                            Diagnose & Retry Connection
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredServers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Database className="w-8 h-8 text-slate-600 mb-1" />
                        <span className="text-slate-400 font-medium">No monitored servers found in PostgreSQL database.</span>
                        <p className="text-slate-500 text-[11px] max-w-sm">
                          Add a server above to establish real-time passive flow capture.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => setIsAddServerOpen(true)}
                          className="mt-2"
                          aria-label="Register First Server"
                        >
                          Register First Server
                        </Button>
                      </div>
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
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
                            onClick={() => setEditingServer(server)}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="Edit Asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingServer(server)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Deregister Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {serversError ? (
            <div className="col-span-full soc-card p-12 bg-background-surface/80 border border-rose-500/30 rounded-xl text-center text-xs">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-100 mb-1">
                {serversDiagnostic?.errorKind === 'backend_offline'
                  ? 'FastAPI Backend Service Offline'
                  : serversDiagnostic?.errorKind === 'database_offline'
                  ? 'PostgreSQL Database Connection Failure'
                  : 'Failed to Retrieve Monitored Servers'}
              </div>
              <p className="text-slate-400 text-xs max-w-md mx-auto mb-3 leading-relaxed">
                {serversError}
              </p>
              {isAutoReconnecting && autoReconnectCountdown > 0 && (
                <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  Auto-reconnecting in {autoReconnectCountdown}s (Attempt #{autoReconnectAttempt})...
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${serversLoading ? 'animate-spin' : ''}`} />}
                onClick={() => retryConnection()}
                disabled={serversLoading}
              >
                Diagnose & Retry Connection
              </Button>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="col-span-full soc-card p-12 bg-background-surface/80 border border-border rounded-xl text-center text-xs text-slate-500">
              <div className="flex flex-col items-center justify-center gap-2">
                <Database className="w-8 h-8 text-slate-600 mb-1" />
                <span className="text-slate-400 font-medium">No matching monitored servers found in PostgreSQL database.</span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsAddServerOpen(true)}
                  className="mt-2"
                  aria-label="Register First Server"
                >
                  Register First Server
                </Button>
              </div>
            </div>
          ) : (
            filteredServers.map((server) => (
              <div
                key={server.id}
                onClick={() => setSelectedServerId(server.id)}
                className="hud-bracket soc-card p-4.5 bg-background-surface/90 border border-border hover:border-sentra-cyan/50 hover:shadow-[0_0_16px_rgba(0,229,255,0.15)] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded bg-background border border-border text-sentra-cyan shrink-0">
                      <Server className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge env={server.environment}>{server.environment}</Badge>
                      <Badge status={server.monitoringStatus}>{server.monitoringStatus}</Badge>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-xs sm:text-sm font-mono font-bold text-text group-hover:text-sentra-cyan transition-colors">
                      {server.name}
                    </h4>
                    <div className="text-[11px] font-mono text-text-muted mt-0.5">
                      {server.ipAddress} • {server.hostname}
                    </div>
                    <p className="text-[11px] text-text-muted mt-2 line-clamp-2 font-sans">
                      {server.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/80">
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono mb-3">
                    <div>
                      <span className="text-text-muted/70 block text-[8px] uppercase tracking-wider">Bandwidth</span>
                      <span className="text-text font-bold">{server.stats.bandwidthMbps} Mbps</span>
                    </div>
                    <div>
                      <span className="text-text-muted/70 block text-[8px] uppercase tracking-wider">Packets/Sec</span>
                      <span className="text-text font-bold">{server.stats.pps}</span>
                    </div>
                    <div>
                      <span className="text-text-muted/70 block text-[8px] uppercase tracking-wider">Threats</span>
                      <span className={`font-bold ${server.activeThreats > 0 ? 'text-sentra-danger' : 'text-sentra-green'}`}>
                        {server.activeThreats > 0 ? `${server.activeThreats} ACTIVE` : 'CLEAN'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-mono text-sentra-cyan">
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
                        onClick={() => setEditingServer(server)}
                      >
                        Edit
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
            ))
          )}
        </div>
      )}

      {/* Edit Server Modal */}
      <EditServerModal
        server={editingServer}
        isOpen={!!editingServer}
        onClose={() => setEditingServer(null)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingServer}
        onClose={() => setDeletingServer(null)}
        title="Deregister Monitored Asset"
        subtitle="Confirm deletion from PostgreSQL database"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Are you sure you want to deregister <strong className="text-slate-100 font-semibold">{deletingServer?.name}</strong> (<span className="font-mono text-slate-200">{deletingServer?.ipAddress}</span>)?
              <p className="mt-1 text-slate-400">
                This action will delete the asset record from PostgreSQL and terminate passive flow monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingServer(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Confirm Deregistration'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
