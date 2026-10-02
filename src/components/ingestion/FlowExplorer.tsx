import React, { useState, useEffect } from 'react';
import { flowsApi } from '@/services/flows';
import { TrafficFlow } from '@/types';
import { Button } from '@/components/common/Button';
import { FlowDetailModal } from './FlowDetailModal';
import { 
  Layers, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowRight, 
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface FlowExplorerProps {
  initialImportId?: number | null;
}

export const FlowExplorer: React.FC<FlowExplorerProps> = ({ initialImportId = null }) => {
  const [flows, setFlows] = useState<TrafficFlow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [importId, setImportId] = useState<string>(initialImportId ? String(initialImportId) : '');
  const [sourceIp, setSourceIp] = useState('');
  const [destinationIp, setDestinationIp] = useState('');
  const [protocol, setProtocol] = useState('all');

  // Pagination states
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Selected flow for modal
  const [selectedFlow, setSelectedFlow] = useState<TrafficFlow | null>(null);

  useEffect(() => {
    if (initialImportId) {
      setImportId(String(initialImportId));
      setPage(0);
    }
  }, [initialImportId]);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await flowsApi.getFlows({
        import_id: importId ? parseInt(importId, 10) : undefined,
        source_ip: sourceIp || undefined,
        destination_ip: destinationIp || undefined,
        protocol: protocol !== 'all' ? protocol : undefined,
        skip: page * pageSize,
        limit: pageSize,
      });
      setFlows(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to query directional traffic flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [page, importId, protocol]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchFlows();
  };

  const handleResetFilters = () => {
    setImportId('');
    setSourceIp('');
    setDestinationIp('');
    setProtocol('all');
    setPage(0);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filter Control Bar */}
      <div className="soc-card p-4 bg-background-surface/90 border border-border rounded-xl">
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-3">
          {/* Source IP Filter */}
          <div className="relative min-w-[150px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Source IP (e.g. 192.168.1.10)"
              value={sourceIp}
              onChange={(e) => setSourceIp(e.target.value)}
              className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/20 font-mono"
            />
          </div>

          {/* Destination IP Filter */}
          <div className="relative min-w-[150px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Destination IP (e.g. 10.0.0.1)"
              value={destinationIp}
              onChange={(e) => setDestinationIp(e.target.value)}
              className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/20 font-mono"
            />
          </div>

          {/* Protocol Filter */}
          <select
            value={protocol}
            onChange={(e) => {
              setProtocol(e.target.value);
              setPage(0);
            }}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Protocols</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="ICMP">ICMP</option>
          </select>

          {/* Import ID Filter */}
          <div className="w-28">
            <input
              type="number"
              placeholder="Import ID"
              value={importId}
              onChange={(e) => setImportId(e.target.value)}
              className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/20 font-mono"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
            Filter
          </Button>

          {(sourceIp || destinationIp || protocol !== 'all' || importId) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          )}

          <button
            type="button"
            onClick={fetchFlows}
            className={`p-1.5 rounded bg-background-card border border-border text-slate-400 hover:text-sentra-cyan transition-colors ml-auto ${
              loading ? 'animate-spin text-sentra-cyan' : ''
            }`}
            title="Refresh flows"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Unidirectional Info Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Showing <strong className="text-slate-200">{flows.length}</strong> of <strong className="text-slate-200">{total}</strong> Directional Flows</span>
        </div>
        <span className="font-mono text-[11px] text-sentra-cyan">
          Ordered 5-Tuple: (Src IP, Src Port, Dst IP, Dst Port, Protocol)
        </span>
      </div>

      {/* Data Table */}
      <div className="soc-card bg-background-surface/80 border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-background-subtle/40 text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4 font-medium">Source IP</th>
                <th className="py-3 px-3 font-medium">Port</th>
                <th className="py-3 px-4 font-medium">Destination IP</th>
                <th className="py-3 px-3 font-medium">Port</th>
                <th className="py-3 px-3 font-medium">Protocol</th>
                <th className="py-3 px-3 font-medium text-right">Packets</th>
                <th className="py-3 px-3 font-medium text-right">Volume</th>
                <th className="py-3 px-3 font-medium text-right">Duration</th>
                <th className="py-3 px-4 font-medium">Start Time</th>
                <th className="py-3 px-4 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-[11px]">
              {flows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-slate-500 font-sans">
                    {loading ? (
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-sentra-cyan" />
                        <span>Querying directional flow database...</span>
                      </div>
                    ) : (
                      'No directional flows match the selected query. Ingest a PCAP file to generate flows.'
                    )}
                  </td>
                </tr>
              ) : (
                flows.map((flow) => (
                  <tr
                    key={flow.id}
                    onClick={() => setSelectedFlow(flow)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-200 group-hover:text-sentra-cyan transition-colors">
                      {flow.source_ip}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {flow.source_port ?? '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {flow.destination_ip}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {flow.destination_port ?? '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        flow.protocol === 'TCP'
                          ? 'bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30'
                          : flow.protocol === 'UDP'
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {flow.protocol}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                      {flow.packet_count.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {formatBytes(flow.byte_count)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {flow.duration > 0 ? `${flow.duration.toFixed(3)}s` : '< 1ms'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap text-[10px]">
                      {flow.start_time ? new Date(flow.start_time).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFlow(flow);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-sentra-cyan hover:bg-slate-800 transition-colors"
                        title="View flow metadata"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>
              Page {page + 1} of {totalPages} ({total} flows)
            </span>
            <div className="flex items-center gap-1 font-sans">
              <Button
                variant="outline"
                size="sm"
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Flow Details Modal */}
      <FlowDetailModal
        flow={selectedFlow}
        isOpen={!!selectedFlow}
        onClose={() => setSelectedFlow(null)}
      />
    </div>
  );
};
