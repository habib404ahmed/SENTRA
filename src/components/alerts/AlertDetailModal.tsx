import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  FileText, 
  Radio, 
  Layers, 
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Plus,
  Activity,
  Cpu,
  Info,
  History,
  Check,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { AlertStatus } from '@/types';

export const AlertDetailModal: React.FC = () => {
  const { 
    selectedAlertId, 
    setSelectedAlertId, 
    alerts, 
    updateAlertStatus, 
    setSelectedServerId, 
    setActivePage 
  } = useApp();

  const [noteText, setNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<AlertStatus | null>(null);

  if (!selectedAlertId) return null;

  const alert = alerts.find(a => a.id === selectedAlertId);
  if (!alert) return null;

  const handleStatusChangeWithNote = async (newStatus: AlertStatus) => {
    await updateAlertStatus(alert.id, newStatus, noteText.trim() || undefined);
    setNoteText('');
    setIsAddingNote(false);
    setPendingStatus(null);
  };

  const handleAddNoteOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await updateAlertStatus(alert.id, alert.status, noteText.trim());
    setNoteText('');
    setIsAddingNote(false);
  };

  const se = alert.structuredEvidence;
  const netFacts = se?.observed_network_facts;
  const inferences = se?.model_inferences;

  return (
    <Modal
      isOpen={!!selectedAlertId}
      onClose={() => setSelectedAlertId(null)}
      title={`Incident Investigation: ${alert.id}`}
      subtitle={`Classified as ${alert.threat} (${alert.protocol})`}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Incident Summary Banner */}
        <div className="p-4 rounded-xl bg-background-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-lg border shrink-0 ${
              alert.severity === 'critical'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : alert.severity === 'high'
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-slate-100">{alert.threat}</span>
                <Badge severity={alert.severity}>{alert.severity}</Badge>
                <Badge status={alert.status}>{alert.status.replace('_', ' ')}</Badge>
                {alert.occurrenceCount && alert.occurrenceCount > 1 ? (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Aggregated x{alert.occurrenceCount}
                  </span>
                ) : null}
                {alert.detectionDecision && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-slate-800 text-sentra-cyan border border-sentra-cyan/30">
                    {alert.detectionDecision.replace('_', ' ')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400 font-mono">
                <span>Observed Source: <strong className="text-rose-400">{alert.sourceIp}</strong></span>
                <span>Destination Target: <strong className="text-slate-200">{alert.destinationIp}:{alert.destinationPort}</strong></span>
                <span>Asset: <span className="text-sentra-cyan underline cursor-pointer hover:text-cyan-300" onClick={() => {
                  setSelectedAlertId(null);
                  setSelectedServerId(alert.serverId);
                  setActivePage('servers');
                }}>{alert.serverName}</span></span>
                {alert.firstSeenAt && alert.occurrenceCount && alert.occurrenceCount > 1 && (
                  <span>First Seen: <strong className="text-slate-400">{alert.firstSeenAt}</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Model Score Pill */}
          <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-border">
            <span className="text-[10px] font-mono uppercase text-slate-400">Model Inference Score</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-2xl font-bold font-mono ${
                alert.modelScore >= 90 ? 'text-rose-400' : alert.modelScore >= 70 ? 'text-orange-400' : 'text-amber-400'
              }`}>
                {typeof alert.modelScore === 'number' ? `${alert.modelScore.toFixed(0)}%` : alert.modelScore}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono text-right space-y-0.5 mt-0.5">
              <div>Policy: {alert.detectionPolicyVersion || 'v1.0.0'}</div>
              <div>Model: {alert.modelVersion || 'RF v1.0.4'}</div>
            </div>
          </div>
        </div>

        {/* SOC Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-background-subtle border border-border">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Lifecycle Status:</span>
            <Badge status={alert.status}>{alert.status.replace('_', ' ').toUpperCase()}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {alert.status === 'new' && (
              <Button
                variant="outline"
                size="sm"
                icon={<Check className="w-3.5 h-3.5 text-indigo-400" />}
                onClick={() => handleStatusChangeWithNote('acknowledged')}
              >
                Acknowledge
              </Button>
            )}

            {alert.status !== 'investigating' && alert.status !== 'resolved' && alert.status !== 'false_positive' && (
              <Button
                variant="outline"
                size="sm"
                icon={<Activity className="w-3.5 h-3.5 text-amber-400" />}
                onClick={() => handleStatusChangeWithNote('investigating')}
              >
                Investigate
              </Button>
            )}

            {alert.status !== 'resolved' && (
              <Button
                variant="success"
                size="sm"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => handleStatusChangeWithNote('resolved')}
              >
                Resolve
              </Button>
            )}

            {alert.status !== 'false_positive' && alert.status !== 'resolved' && (
              <Button
                variant="secondary"
                size="sm"
                icon={<XCircle className="w-3.5 h-3.5 text-slate-400" />}
                onClick={() => handleStatusChangeWithNote('false_positive')}
              >
                False Positive
              </Button>
            )}

            {(alert.status === 'resolved' || alert.status === 'false_positive') && (
              <Button
                variant="danger"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => handleStatusChangeWithNote('new')}
              >
                Reopen Incident
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              onClick={() => setIsAddingNote(!isAddingNote)}
            >
              Add Note
            </Button>
          </div>
        </div>

        {/* Note input if open */}
        {isAddingNote && (
          <form onSubmit={handleAddNoteOnly} className="p-3.5 rounded-lg bg-slate-900 border border-border space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Analyst Investigation Note:
            </label>
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record forensic observation, mitigation steps taken, or triage rationale..."
              className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/20 font-sans"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAddingNote(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Save Note
              </Button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Evidence & Telemetry */}
          <div className="space-y-4">
            {/* Structured Telemetry vs Inferences */}
            <div className="p-4 rounded-xl bg-background-card border border-border space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-sentra-cyan" />
                Structured Detection Evidence
              </h4>

              {/* Observed Network Facts */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  Observed Network Facts (Passive Telemetry)
                </span>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-border text-slate-300">
                  <div>Source IP: <span className="text-rose-400 font-bold">{alert.sourceIp}</span></div>
                  <div>Dest Target: <span className="text-slate-200">{alert.destinationIp}:{alert.destinationPort}</span></div>
                  <div>Protocol: <span className="text-sentra-cyan">{alert.protocol}</span></div>
                  {netFacts?.packet_count !== undefined && (
                    <div>Packets: <span className="text-slate-200">{netFacts.packet_count}</span></div>
                  )}
                  {netFacts?.byte_count !== undefined && (
                    <div>Bytes: <span className="text-slate-200">{netFacts.byte_count.toLocaleString()}</span></div>
                  )}
                  {netFacts?.duration_seconds !== undefined && (
                    <div>Duration: <span className="text-slate-200">{netFacts.duration_seconds.toFixed(2)}s</span></div>
                  )}
                  {netFacts?.directional_ratio !== undefined && (
                    <div>Directional Ratio: <span className="text-amber-300">1.0 (Unidirectional)</span></div>
                  )}
                </div>
              </div>

              {/* Model Inferences */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  Model Inferences (Probabilistic Classifiers)
                </span>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-border text-slate-300">
                  <div>Predicted Class: <span className="text-sentra-cyan font-bold">{alert.threatClass || alert.threat}</span></div>
                  <div>Confidence / Vote: <span className="text-rose-400 font-bold">{(alert.modelScore).toFixed(1)}%</span></div>
                  <div>Detection Type: <span className="text-slate-200">{alert.detectionType || 'supervised_classification'}</span></div>
                  <div>Anomaly Status: <span className={alert.anomalyScore != null && alert.anomalyScore > 0 ? "text-purple-400 font-bold" : "text-emerald-400"}>
                    {alert.anomalyScore != null ? `Score ${alert.anomalyScore.toFixed(2)}` : 'Normal'}
                  </span></div>
                  <div>Consensus Decision: <span className="text-amber-300">{alert.detectionDecision || 'likely_malicious'}</span></div>
                  <div>Feature Schema: <span className="text-slate-400">{alert.featureSchemaVersion || 'v1.0.0'}</span></div>
                </div>
              </div>

              {/* Behavioral Indicators */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                  Behavioral Indicators
                </span>
                <ul className="space-y-1.5">
                  {(Array.isArray(se?.behavioral_indicators) ? (se.behavioral_indicators as string[]) : alert.evidence).map((ev: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-border/60"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sentra-cyan mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimers & Integrity Note */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold font-mono">
                  <Info className="w-3.5 h-3.5 text-sentra-cyan shrink-0" />
                  Forensic Telemetry Boundary
                </div>
                <p>
                  Unidirectional IP telemetry measures unidirectional flow characteristics without payload decryption. Model scores represent pattern similarity to evaluated profiles rather than absolute actor identity attribution.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Lifecycle Audit Trail & Timeline */}
          <div className="space-y-4">
            {/* Status History Audit Trail */}
            <div className="p-4 rounded-xl bg-background-card border border-border space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Alert Lifecycle Audit Trail ({alert.history?.length || 0})
              </h4>

              {alert.history && alert.history.length > 0 ? (
                <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                  {alert.history.map((hist, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background-card" />
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            {hist.previousStatus ? `${hist.previousStatus} → ` : ''}
                            <span className="text-emerald-300">{hist.newStatus}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{hist.changedAt}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Operator: <span className="text-slate-300">{hist.changedBy || 'SENTRA Automation'}</span>
                        </div>
                        {hist.note && (
                          <p className="text-[11px] text-slate-300 mt-1 bg-slate-900/80 p-2 rounded border border-border/60">
                            "{hist.note}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-3 text-center font-mono">
                  Initial incident detection state: <Badge status={alert.status}>{alert.status}</Badge>
                </div>
              )}
            </div>

            {/* Ingestion & Detection Pipeline Timeline */}
            <div className="p-4 rounded-xl bg-background-card border border-border space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Processing Pipeline Timeline
              </h4>

              <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                {alert.timeline && alert.timeline.length > 0 ? (
                  alert.timeline.map((step, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-sentra-cyan border-2 border-background-card" />
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{step.event}</span>
                          <span className="text-[10px] font-mono text-slate-500">{step.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {step.details}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="relative">
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-sentra-cyan border-2 border-background-card" />
                    <div className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">Feature Extraction & Consensus Decision</span>
                        <span className="text-[10px] font-mono text-slate-500">{alert.detectedAt}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Flow telemetry parsed through schema {alert.featureSchemaVersion || 'v1.0.0'} and evaluated via detection policy {alert.detectionPolicyVersion || 'v1.0.0'}.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Analyst Notes Log */}
            {alert.notes && alert.notes.length > 0 && (
              <div className="p-4 rounded-xl bg-background-card border border-border space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Analyst Forensic Notes ({alert.notes.length})
                </h4>
                <div className="space-y-2">
                  {alert.notes.map((note, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-900/80 border border-border text-xs text-slate-300 font-mono">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span className="font-mono text-[11px] text-center sm:text-left">
            Incident Ref: {alert.id} • Target Flow: {alert.flowId || 'Synthetic/Real Flow'}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedAlertId(null)} className="w-full sm:w-auto">
            Dismiss
          </Button>
        </div>
      </div>
    </Modal>
  );
};
