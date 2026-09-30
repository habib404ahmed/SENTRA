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
  Plus
} from 'lucide-react';

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

  if (!selectedAlertId) return null;

  const alert = alerts.find(a => a.id === selectedAlertId);
  if (!alert) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await updateAlertStatus(alert.id, alert.status, noteText.trim());
    setNoteText('');
    setIsAddingNote(false);
  };

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
                : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-100">{alert.threat}</span>
                <Badge severity={alert.severity}>{alert.severity}</Badge>
                <Badge status={alert.status}>{alert.status}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400 font-mono">
                <span>Observed Source IP: <strong className="text-rose-400">{alert.sourceIp}</strong></span>
                <span>Target: <strong className="text-slate-200">{alert.destinationIp}:{alert.destinationPort}</strong></span>
                <span>Asset: <span className="text-sentra-cyan underline cursor-pointer" onClick={() => {
                  setSelectedAlertId(null);
                  setSelectedServerId(alert.serverId);
                  setActivePage('servers');
                }}>{alert.serverName}</span></span>
              </div>
            </div>
          </div>

          {/* Model Score Pill */}
          <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-border">
            <span className="text-[10px] font-mono uppercase text-slate-400">Model Score</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-2xl font-bold font-mono ${
                alert.modelScore >= 90 ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {alert.modelScore}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Random Forest + Isolation</span>
          </div>
        </div>

        {/* SOC Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-background-subtle border border-border">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Incident Status:</span>
            <Badge status={alert.status}>{alert.status.toUpperCase()}</Badge>
          </div>

          <div className="flex items-center gap-2">
            {alert.status !== 'investigating' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateAlertStatus(alert.id, 'investigating')}
              >
                Mark as Investigating
              </Button>
            )}

            {alert.status !== 'resolved' && (
              <Button
                variant="success"
                size="sm"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => updateAlertStatus(alert.id, 'resolved')}
              >
                Mark as Resolved
              </Button>
            )}

            {alert.status === 'resolved' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => updateAlertStatus(alert.id, 'active')}
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
          <form onSubmit={handleAddNote} className="p-3.5 rounded-lg bg-slate-900 border border-border space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Analyst Investigation Note:
            </label>
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record forensic observation, mitigation steps taken, or threat actor attribution rationale..."
              className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/20"
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
          {/* Evidence Section */}
          <div className="p-4 rounded-xl bg-background-card border border-border space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-sentra-cyan" />
              Behavioral Evidence (Unidirectional Telemetry)
            </h4>
            <p className="text-[11px] text-slate-400">
              Observed characteristics extracted from packet headers and flow timing without payload decryption:
            </p>

            <ul className="space-y-2">
              {alert.evidence.map((ev, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-border/80"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sentra-cyan mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{ev}</span>
                </li>
              ))}
            </ul>

            {/* Packet Header Snapshot if available */}
            {alert.packetSample && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
                  Flow Header Sample:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-950 p-2.5 rounded-lg border border-border text-slate-300">
                  <div>Header Size: <span className="text-sentra-cyan">{alert.packetSample.headerSize} bytes</span></div>
                  <div>Payload Size: <span className="text-sentra-cyan">{alert.packetSample.payloadSize} bytes</span></div>
                  <div>TCP Flags: <span className="text-rose-400">{alert.packetSample.flags}</span></div>
                  <div>Window Size: <span className="text-slate-400">{alert.packetSample.windowSize}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline & Notes Section */}
          <div className="space-y-4">
            {/* Timeline */}
            <div className="p-4 rounded-xl bg-background-card border border-border space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Detection & Processing Pipeline
              </h4>

              <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                {alert.timeline.map((step, idx) => (
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
                ))}
              </div>
            </div>

            {/* Notes Log */}
            {alert.notes && alert.notes.length > 0 && (
              <div className="p-4 rounded-xl bg-background-card border border-border space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Investigation Notes ({alert.notes.length})
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
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Passive Sensor Alert ID: {alert.id} • SIH-26145 Mock Telemetry
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedAlertId(null)}>
            Dismiss
          </Button>
        </div>
      </div>
    </Modal>
  );
};
