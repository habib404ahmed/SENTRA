import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Tabs } from '@/components/common/Tabs';
import { 
  Server, 
  Activity, 
  ShieldAlert, 
  Network, 
  Cpu, 
  Radio, 
  Play, 
  Pause, 
  ExternalLink,
  Lock,
  ArrowUpRight,
  Edit2,
  Trash2
} from 'lucide-react';
import { EditServerModal } from './EditServerModal';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

export const ServerDetailModal: React.FC = () => {
  const { 
    selectedServerId, 
    setSelectedServerId, 
    servers, 
    alerts, 
    toggleServerMonitoring,
    setSelectedAlertId,
    deleteServer
  } = useApp();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!selectedServerId) return null;

  const server = servers.find(s => s.id === selectedServerId);
  if (!server) return null;

  const serverAlerts = alerts.filter(a => a.serverId === server.id);

  const handleDelete = async () => {
    if (window.confirm(`Deregister "${server.name}" (${server.ipAddress}) from PostgreSQL?`)) {
      setIsDeleting(true);
      await deleteServer(server.id);
      setIsDeleting(false);
    }
  };

  // Generate realistic telemetry chart for this specific asset
  const assetTelemetry = [
    { time: '12:00', pps: Math.round(server.stats.pps * 0.7), mbps: Math.round(server.stats.bandwidthMbps * 0.65), threats: 0 },
    { time: '12:15', pps: Math.round(server.stats.pps * 0.85), mbps: Math.round(server.stats.bandwidthMbps * 0.8), threats: 0 },
    { time: '12:30', pps: Math.round(server.stats.pps * 1.1), mbps: Math.round(server.stats.bandwidthMbps * 1.05), threats: server.activeThreats > 0 ? 1 : 0 },
    { time: '12:45', pps: Math.round(server.stats.pps * 1.4), mbps: Math.round(server.stats.bandwidthMbps * 1.3), threats: server.activeThreats },
    { time: '13:00', pps: Math.round(server.stats.pps * 1.25), mbps: Math.round(server.stats.bandwidthMbps * 1.15), threats: server.activeThreats },
    { time: '13:15', pps: Math.round(server.stats.pps), mbps: Math.round(server.stats.bandwidthMbps), threats: server.activeThreats },
  ];

  return (
    <Modal
      isOpen={!!selectedServerId}
      onClose={() => setSelectedServerId(null)}
      title={server.name}
      subtitle={`Asset ID: ${server.id} • ${server.hostname} (${server.ipAddress})`}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Top Asset Identity Header Card */}
        <div className="p-4 rounded-xl bg-background-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-sentra-cyan shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-100">{server.name}</span>
                <Badge env={server.environment}>{server.environment}</Badge>
                <Badge status={server.monitoringStatus}>{server.monitoringStatus}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400 font-mono">
                <span>IP: <strong className="text-slate-200">{server.ipAddress}</strong></span>
                <span>Type: <span className="text-slate-300">{server.serverType}</span></span>
                <span>Source: <span className="text-sentra-cyan">{server.trafficSource}</span></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={server.monitoringStatus === 'active' ? 'outline' : 'success'}
              size="sm"
              icon={server.monitoringStatus === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              onClick={() => toggleServerMonitoring(server.id)}
            >
              {server.monitoringStatus === 'active' ? 'Pause Tap' : 'Resume Tap'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Deregister'}
            </Button>
          </div>
        </div>

        {/* Tab Controls */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Telemetry Overview' },
            { id: 'traffic', label: 'Traffic & Packets' },
            { id: 'threats', label: 'Associated Threats', badge: serverAlerts.length },
            { id: 'events', label: 'Ingestion Audit' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 4 Stat Boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-background-card border border-border">
                <span className="text-[10px] uppercase font-mono text-slate-400">Packets Ingested</span>
                <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
                  {server.stats.packetsProcessed}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Passive mirror</span>
              </div>

              <div className="p-3 rounded-lg bg-background-card border border-border">
                <span className="text-[10px] uppercase font-mono text-slate-400">Bytes Processed</span>
                <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
                  {server.stats.bytesProcessed}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Last 24h window</span>
              </div>

              <div className="p-3 rounded-lg bg-background-card border border-border">
                <span className="text-[10px] uppercase font-mono text-slate-400">Flow Telemetry</span>
                <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
                  {server.stats.flowCount}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Unidirectional flows</span>
              </div>

              <div className="p-3 rounded-lg bg-background-card border border-border">
                <span className="text-[10px] uppercase font-mono text-slate-400">Active Threats</span>
                <div className={`text-xl font-bold font-mono mt-0.5 ${server.activeThreats > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {server.activeThreats}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {server.activeThreats > 0 ? 'Requires SOC action' : 'No active anomaly'}
                </span>
              </div>
            </div>

            {/* Ingress Telemetry Chart */}
            <div className="p-4 rounded-xl bg-background-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-sentra-cyan" />
                  Bandwidth & Ingress Rate (15m Intervals)
                </h4>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-sentra-cyan flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-sentra-cyan"></span> Mbps
                  </span>
                  <span className="text-purple-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-purple-400"></span> PPS
                  </span>
                </div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={assetTelemetry}>
                    <defs>
                      <linearGradient id="serverMbpsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111723', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="mbps" name="Bandwidth (Mbps)" stroke="#06b6d4" strokeWidth={2} fill="url(#serverMbpsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Description & Diode Details */}
            <div className="p-3.5 rounded-lg bg-background-subtle border border-border/80 text-xs text-slate-300">
              <span className="font-semibold text-slate-200 block mb-1">Asset Operational Context:</span>
              <p className="text-slate-400 leading-relaxed">{server.description}</p>
            </div>
          </div>
        )}

        {/* Tab 2: Traffic */}
        {activeTab === 'traffic' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-background-card border border-border">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono mb-3">
                Packets Per Second (PPS) Ingress Waveform
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={assetTelemetry}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#111723', borderColor: '#1e293b', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="pps" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-background-card border border-border">
                <span className="font-semibold text-slate-300 block mb-2 font-mono">Flow Characteristics</span>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Connection Rate:</span>
                    <span className="text-slate-200">{server.stats.connectionRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Packet Size:</span>
                    <span className="text-slate-200">542 bytes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SYN / ACK Ratio:</span>
                    <span className="text-slate-200">1.00 (Unidirectional Tap)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Buffer Drop Rate:</span>
                    <span className="text-emerald-400">0.00% (Lossless)</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-background-card border border-border">
                <span className="font-semibold text-slate-300 block mb-2 font-mono">Diode Interface</span>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Tap Hardware:</span>
                    <span className="text-sentra-cyan">10G Passive Optical Splitter</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Return Path:</span>
                    <span className="text-emerald-400">Physically Blocked (Photodiode Only)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Optical Link Margin:</span>
                    <span className="text-slate-200">-14.2 dBm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Telemetry Packet:</span>
                    <span className="text-slate-200">{server.lastActivity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Threats */}
        {activeTab === 'threats' && (
          <div className="space-y-3">
            {serverAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-border rounded-xl bg-background-card">
                No active or past threats recorded for this server asset.
              </div>
            ) : (
              serverAlerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  className="p-4 rounded-xl bg-background-card border border-border hover:border-slate-600 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-slate-800 text-rose-400 shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200 group-hover:text-sentra-cyan transition-colors">
                          {alert.threat}
                        </span>
                        <Badge severity={alert.severity}>{alert.severity}</Badge>
                        <Badge status={alert.status}>{alert.status}</Badge>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-3">
                        <span>Source: <strong className="text-rose-400">{alert.sourceIp}</strong></span>
                        <span>Model Score: <strong className="text-amber-400">{alert.modelScore}%</strong></span>
                        <span>{alert.detectedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="text-xs text-sentra-cyan flex items-center gap-1 font-medium group-hover:underline">
                      Examine Evidence <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Ingestion Audit Events */}
        {activeTab === 'events' && (
          <div className="p-4 rounded-xl bg-background-card border border-border space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between py-1.5 border-b border-border/60 text-slate-400 text-[11px]">
              <span>[2026-09-30 13:25:00] Optical tap buffer synced (0.00% frame loss)</span>
              <span className="text-emerald-400">INFO</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/60 text-slate-400 text-[11px]">
              <span>[2026-09-30 13:20:10] Flow exporter heartbeats received (NetFlow v9)</span>
              <span className="text-emerald-400">INFO</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/60 text-slate-400 text-[11px]">
              <span>[2026-09-30 13:18:40] Anomaly threshold evaluated: Score 0.94</span>
              <span className="text-rose-400">FLAGGED</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-slate-400 text-[11px]">
              <span>[2026-09-30 12:00:00] Initial flow baseline established from passive observation</span>
              <span className="text-sentra-cyan">SETUP</span>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px] text-sentra-cyan">
            PostgreSQL Asset ID: #{server.id} • Live Database Record
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedServerId(null)}>
            Close Console
          </Button>
        </div>
      </div>

      <EditServerModal
        server={server}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </Modal>
  );
};
