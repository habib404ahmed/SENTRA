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
      <div className="hud-bracket soc-card p-4 bg-background-surface/90 border border-border space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search threat, IP (e.g. 192.168.1.100), ID, asset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border focus:border-sentra-cyan rounded px-3 pl-8 py-1.5 text-xs font-mono text-text placeholder-text-muted/60 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/40"
            />
          </div>

          {/* Quick Stats Badges & Run Detection Button */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-text-muted font-mono text-[10px] uppercase tracking-wider">PIPELINE:</span>
              <span className="px-2 py-0.5 rounded bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30 font-mono font-bold text-[10px]">
                {alerts.filter(a => a.status === 'new').length} NEW
              </span>
              <span className="px-2 py-0.5 rounded bg-sentra-critical/15 text-sentra-critical border border-sentra-critical/40 font-mono font-bold text-[10px]">
                {alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved' && a.status !== 'false_positive').length} CRITICAL
              </span>
              <span className="px-2 py-0.5 rounded bg-sentra-amber/15 text-sentra-amber border border-sentra-amber/30 font-mono font-bold text-[10px]">
                {alerts.filter(a => a.status === 'investigating').length} INVESTIGATING
              </span>
              <span className="px-2 py-0.5 rounded bg-sentra-green/15 text-sentra-green border border-sentra-green/30 font-mono font-bold text-[10px]">
                {alerts.filter(a => a.status === 'resolved').length} RESOLVED
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5 fill-current" />}
              onClick={() => setIsRunModalOpen(true)}
              className="ml-auto"
            >
              RUN DETECTION
            </Button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2.5 border-t border-border/80">
          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-background border border-border text-text rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="critical">CRITICAL (P1)</option>
            <option value="high">HIGH (P2)</option>
            <option value="medium">MEDIUM (P3)</option>
            <option value="low">LOW (P4)</option>
          </select>

          {/* Threat Category */}
          <select
            value={selectedThreat}
            onChange={(e) => setSelectedThreat(e.target.value)}
            className="bg-background border border-border text-text rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">ALL THREAT TYPES</option>
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
            className="bg-background border border-border text-text rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">ALL ASSETS</option>
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
            className="bg-background border border-border text-text rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">ALL STATUSES</option>
            <option value="new">NEW (UNREVIEWED)</option>
            <option value="acknowledged">ACKNOWLEDGED</option>
            <option value="investigating">INVESTIGATING</option>
            <option value="resolved">RESOLVED</option>
            <option value="false_positive">FALSE POSITIVE</option>
          </select>

          {/* Reset Action */}
          <button
            onClick={resetFilters}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-background-card border border-border text-text-muted hover:text-text hover:border-border-bright text-xs font-mono uppercase tracking-wider transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="hud-bracket soc-card bg-background-surface/90 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-background/60 text-text-muted uppercase tracking-wider text-[10px] font-mono">
                <th className="py-2.5 px-4 font-medium">Severity</th>
                <th className="py-2.5 px-4 font-medium">Incident ID / Threat</th>
                <th className="py-2.5 px-4 font-medium">Observed Source IP</th>
                <th className="py-2.5 px-4 font-medium">Destination Target</th>
                <th className="py-2.5 px-4 font-medium">Monitored Asset</th>
                <th className="py-2.5 px-4 font-medium">Protocol</th>
                <th className="py-2.5 px-4 font-medium">Model / Anomaly Score</th>
                <th className="py-2.5 px-4 font-medium">Detected At (UTC)</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs font-mono text-text-muted">
                    NO THREAT INCIDENTS MATCHING SELECTED QUERY.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isCritical = alert.severity === 'critical';
                  return (
                    <tr
                      key={alert.id}
                      onClick={() => setSelectedAlertId(alert.id)}
                      className={`hover:bg-background-card/70 transition-colors group cursor-pointer ${
                        isCritical ? 'bg-sentra-critical/[0.04]' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <Badge severity={alert.severity}>{alert.severity}</Badge>
                      </td>

                      <td className="py-3 px-4 font-medium text-text">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-text group-hover:text-sentra-cyan transition-colors">
                              {alert.threat}
                            </span>
                            {alert.occurrenceCount && alert.occurrenceCount > 1 ? (
                              <span 
                                className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sentra-purple/20 text-sentra-purple border border-sentra-purple/30" 
                                title={`Aggregated alert: seen ${alert.occurrenceCount} times in 24h`}
                              >
                                x{alert.occurrenceCount}
                              </span>
                            ) : null}
                            {alert.detectionDecision && (
                              <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-background text-text-muted border border-border">
                                {alert.detectionDecision.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-text-muted block mt-0.5">
                            {alert.id}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-text">
                        <span className="bg-background px-1.5 py-0.5 rounded border border-border text-sentra-danger">
                          {alert.sourceIp}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-text-muted text-[11px]">
                        {alert.destinationIp}:{alert.destinationPort}
                      </td>

                      <td className="py-3 px-4 text-text font-mono text-[11px]">
                        {alert.serverName}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted">
                        {alert.protocol}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div>
                          <span className={`font-bold ${
                            alert.modelScore >= 90 ? 'text-sentra-critical' : alert.modelScore >= 70 ? 'text-sentra-danger' : 'text-sentra-amber'
                          }`}>
                            {typeof alert.modelScore === 'number' ? `${alert.modelScore.toFixed(0)}%` : alert.modelScore}
                          </span>
                          {alert.detectionType === 'anomaly' && (
                            <span className="block text-[9px] text-sentra-cyan font-mono">
                              Anomaly: {alert.anomalyScore != null ? alert.anomalyScore.toFixed(2) : 'detected'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-text-muted text-[11px] whitespace-nowrap">
                        {alert.detectedAt}
                      </td>

                      <td className="py-3 px-4">
                        <Badge status={alert.status}>{alert.status}</Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedAlertId(alert.id)}
                            className="p-1.5 rounded text-text-muted hover:text-sentra-cyan hover:bg-background transition-colors"
                            title="Examine incident details & evidence"
                            aria-label="Examine incident details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
