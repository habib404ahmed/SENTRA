import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  RotateCcw,
  Layers,
  Play,
  Activity,
  Cpu
} from 'lucide-react';
import { Severity, ThreatCategory, AlertStatus } from '@/types';
import { RunDetectionModal } from './RunDetectionModal';

export const AlertTable: React.FC = () => {
  const { alerts, setSelectedAlertId, servers, updateAlertStatus } = useApp();

  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedThreat, setSelectedThreat] = useState<string>('all');
  const [selectedServer, setSelectedServer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('24h');
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.threat.toLowerCase().includes(search.toLowerCase()) ||
      alert.sourceIp.includes(search) ||
      alert.destinationIp.includes(search) ||
      alert.serverName.toLowerCase().includes(search.toLowerCase()) ||
      alert.id.toLowerCase().includes(search.toLowerCase()) ||
      (alert.detectionDecision && alert.detectionDecision.toLowerCase().includes(search.toLowerCase()));

    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const matchesThreat = selectedThreat === 'all' || alert.threat === selectedThreat;
    const matchesServer = selectedServer === 'all' || alert.serverId === selectedServer;
    const matchesStatus = selectedStatus === 'all' || alert.status === selectedStatus;

    return matchesSearch && matchesSeverity && matchesThreat && matchesServer && matchesStatus;
  });

  const resetFilters = () => {
    setSearch('');
    setSelectedSeverity('all');
    setSelectedThreat('all');
    setSelectedServer('all');
    setSelectedStatus('all');
  };

  const activeAlerts = alerts.filter(a => a.status === 'new' || a.status === 'acknowledged' || a.status === 'investigating' || a.status === 'active');

  return (
    <div className="space-y-4">
      {/* Filters & Action Toolbar */}
      <div className="soc-card p-4 bg-background-surface/90 border border-border rounded-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by threat, IP (e.g. 192.168.1.100), ID, asset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/20"
            />
          </div>

          {/* Quick Stats Badges & Run Detection Button */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-400 font-mono text-[11px]">Pipeline Status:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono font-semibold">
                {alerts.filter(a => a.status === 'new').length} New
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono font-semibold">
                {alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved' && a.status !== 'false_positive').length} Critical
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                {alerts.filter(a => a.status === 'investigating').length} Investigating
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                {alerts.filter(a => a.status === 'resolved').length} Resolved
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5 fill-current" />}
              onClick={() => setIsRunModalOpen(true)}
              className="bg-sentra-cyan hover:bg-sentra-cyan/90 text-slate-950 font-semibold shadow-sm ml-auto"
            >
              Run Threat Detection
            </Button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-border/60">
          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Threat Category */}
          <select
            value={selectedThreat}
            onChange={(e) => setSelectedThreat(e.target.value)}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Threat Types</option>
            <option value="DDoS">DDoS</option>
            <option value="Port Scan">Port Scan</option>
            <option value="Botnet">Botnet</option>
            <option value="Infiltration">Infiltration</option>
            <option value="Web Attack">Web Attack</option>
            <option value="Brute Force">Brute Force</option>
            <option value="Unknown Anomaly">Unknown Anomaly</option>
          </select>

          {/* Server */}
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Monitored Assets</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Statuses</option>
            <option value="new">New (Unreviewed)</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>

          {/* Reset Action */}
          <button
            onClick={resetFilters}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-card border border-border text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="soc-card bg-background-surface/80 border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-background-subtle/50 text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4 font-medium">Severity</th>
                <th className="py-3 px-4 font-medium">Incident ID / Threat</th>
                <th className="py-3 px-4 font-medium">Observed Source IP</th>
                <th className="py-3 px-4 font-medium">Destination Target</th>
                <th className="py-3 px-4 font-medium">Monitored Asset</th>
                <th className="py-3 px-4 font-medium">Protocol</th>
                <th className="py-3 px-4 font-medium">Model Score</th>
                <th className="py-3 px-4 font-medium">Detected At</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-xs text-slate-500">
                    No threat alerts matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
                    className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <Badge severity={alert.severity}>{alert.severity}</Badge>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-100 group-hover:text-sentra-cyan transition-colors">
                            {alert.threat}
                          </span>
                          {alert.occurrenceCount && alert.occurrenceCount > 1 ? (
                            <span 
                              className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                              title={`Aggregated alert: seen ${alert.occurrenceCount} times in 24h`}
                            >
                              x{alert.occurrenceCount}
                            </span>
                          ) : null}
                          {alert.detectionDecision && (
                            <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {alert.detectionDecision.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                          {alert.id}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-border text-rose-300">
                        {alert.sourceIp}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {alert.destinationIp}:{alert.destinationPort}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {alert.serverName}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {alert.protocol}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div>
                        <span className={`font-semibold ${
                          alert.modelScore >= 90 ? 'text-rose-400' : alert.modelScore >= 70 ? 'text-orange-400' : 'text-amber-400'
                        }`}>
                          {typeof alert.modelScore === 'number' ? `${alert.modelScore.toFixed(0)}%` : alert.modelScore}
                        </span>
                        {alert.detectionType === 'anomaly' && (
                          <span className="block text-[9px] text-purple-400 font-mono">
                            Anomaly Score: {alert.anomalyScore != null ? alert.anomalyScore.toFixed(2) : 'detected'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {alert.detectedAt}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={alert.status}>{alert.status}</Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedAlertId(alert.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-sentra-cyan hover:bg-slate-800 transition-colors"
                          title="Examine incident details"
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

      {/* Detection Execution Modal */}
      <RunDetectionModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
      />
    </div>
  );
};
