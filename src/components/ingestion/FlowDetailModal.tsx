import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { TrafficFlow } from '@/types';
import { 
  ArrowRight, 
  Activity, 
  Clock, 
  Layers, 
  Server, 
  FileText, 
  Zap, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FlowDetailModalProps {
  flow: TrafficFlow | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FlowDetailModal: React.FC<FlowDetailModalProps> = ({ flow, isOpen, onClose }) => {
  if (!flow) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const formatRate = (rate: number, unit: string): string => {
    if (rate >= 1000) return `${(rate / 1000).toFixed(1)}k ${unit}`;
    return `${rate.toFixed(1)} ${unit}`;
  };

  const formatIAT = (seconds: number): string => {
    if (seconds < 0.001) return `${(seconds * 1000000).toFixed(1)} µs`;
    if (seconds < 1.0) return `${(seconds * 1000).toFixed(2)} ms`;
    return `${seconds.toFixed(3)} s`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Directional Traffic Flow Telemetry"
      subtitle={`Flow Record #${flow.id} • Forward-Only Ingress Telemetry`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Unidirectional Flow Endpoint Banner */}
        <div className="p-4 rounded-xl bg-background-card border border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full justify-between md:justify-start">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">Source Host</span>
              <span className="text-sm font-mono font-bold text-slate-100">{flow.source_ip}</span>
              {flow.source_port !== null && flow.source_port !== undefined && (
                <span className="text-[11px] font-mono text-slate-400">Port: {flow.source_port}</span>
              )}
            </div>

            <div className="flex flex-col items-center px-2">
              <span className="text-[10px] font-mono text-sentra-cyan uppercase font-semibold px-2 py-0.5 rounded bg-sentra-cyan/15 border border-sentra-cyan/30">
                {flow.protocol}
              </span>
              <ArrowRight className="w-5 h-5 text-sentra-cyan mt-1" />
            </div>

            <div className="flex flex-col items-end md:items-start">
              <span className="text-[10px] uppercase font-mono text-slate-400">Destination Host</span>
              <span className="text-sm font-mono font-bold text-slate-100">{flow.destination_ip}</span>
              {flow.destination_port !== null && flow.destination_port !== undefined && (
                <span className="text-[11px] font-mono text-slate-400">Port: {flow.destination_port}</span>
              )}
            </div>
          </div>

          <div className="self-stretch md:self-auto flex items-center justify-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono shrink-0">
            Forward Telemetry
          </div>
        </div>

        {/* Unidirectional Architecture Notice */}
        <div className="p-3 rounded-lg bg-sentra-cyan/10 border border-sentra-cyan/20 text-xs text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-sentra-cyan shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-sentra-cyan">Unidirectional Flow Separation:</span> SENTRA records directional flow keys without merging reverse transmission. In optical data diodes and simplex links, reverse ACK channels are physically non-existent.
          </div>
        </div>

        {/* Flow Metric Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-background-subtle/50 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Packet Count</span>
            <span className="text-lg font-bold font-mono text-slate-100">{flow.packet_count.toLocaleString()}</span>
          </div>

          <div className="p-3 rounded-lg bg-background-subtle/50 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Captured Volume</span>
            <span className="text-lg font-bold font-mono text-slate-100">{formatBytes(flow.byte_count)}</span>
          </div>

          <div className="p-3 rounded-lg bg-background-subtle/50 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Flow Duration</span>
            <span className="text-lg font-bold font-mono text-slate-100">{flow.duration.toFixed(4)} s</span>
          </div>

          <div className="p-3 rounded-lg bg-background-subtle/50 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Average Packet Size</span>
            <span className="text-sm font-semibold font-mono text-slate-200">{flow.average_packet_size} Bytes</span>
          </div>

          <div className="p-3 rounded-lg bg-background-subtle/50 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Throughput Rate</span>
            <span className="text-sm font-semibold font-mono text-slate-200">{formatRate(flow.bytes_per_second, 'B/s')}</span>
          </div>

          <div className="p-3 rounded-lg bg-background-subtle/50 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Avg Inter-Arrival (IAT)</span>
            <span className="text-sm font-semibold font-mono text-slate-200">{formatIAT(flow.average_interarrival_time)}</span>
          </div>
        </div>

        {/* TCP Control Flag Counters (If TCP) */}
        {flow.protocol === 'TCP' && (
          <div className="p-4 rounded-xl bg-background-card border border-border space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span>TCP Control Flags</span>
              <span className="text-[11px] font-mono text-slate-400">Recorded Headers</span>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-border">
                <span className="text-[10px] text-slate-400 block mb-1">SYN</span>
                <span className={`text-base font-bold ${flow.tcp_syn_count > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {flow.tcp_syn_count}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-border">
                <span className="text-[10px] text-slate-400 block mb-1">ACK</span>
                <span className={`text-base font-bold ${flow.tcp_ack_count > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {flow.tcp_ack_count}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-border">
                <span className="text-[10px] text-slate-400 block mb-1">FIN</span>
                <span className={`text-base font-bold ${flow.tcp_fin_count > 0 ? 'text-sentra-cyan' : 'text-slate-500'}`}>
                  {flow.tcp_fin_count}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-border">
                <span className="text-[10px] text-slate-400 block mb-1">RST</span>
                <span className={`text-base font-bold ${flow.tcp_rst_count > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {flow.tcp_rst_count}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Ingestion & Host Association */}
        <div className="p-3.5 rounded-lg bg-background-card border border-border/80 text-xs font-mono space-y-2 text-slate-400">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
            <span>Associated Monitored Asset:</span>
            <span className="text-slate-200">{flow.server_name || (flow.server_id ? `Asset #${flow.server_id}` : 'Unassigned / Global Tap')}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
            <span>Source PCAP Ingestion ID:</span>
            <span className="text-sentra-cyan">Import #{flow.import_id}</span>
          </div>
          {flow.start_time && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <span>First Packet Timestamp:</span>
              <span className="text-slate-200">{new Date(flow.start_time).toLocaleString()}</span>
            </div>
          )}
          {flow.end_time && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <span>Last Packet Timestamp:</span>
              <span className="text-slate-200">{new Date(flow.end_time).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Close Explorer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
