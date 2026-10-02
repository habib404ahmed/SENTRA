import React, { useState, useEffect } from 'react';
import { ingestionApi } from '@/services/ingestion';
import { PcapImport } from '@/types';
import { Button } from '@/components/common/Button';
import { 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  ExternalLink,
  Layers,
  Server
} from 'lucide-react';

interface ImportHistoryTableProps {
  onSelectImportForFlows?: (importId: number) => void;
  refreshTrigger?: number;
}

export const ImportHistoryTable: React.FC<ImportHistoryTableProps> = ({
  onSelectImportForFlows,
  refreshTrigger = 0,
}) => {
  const [imports, setImports] = useState<PcapImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ingestionApi.getImports({ limit: 100 });
      setImports(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load PCAP import history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImports();
  }, [refreshTrigger]);

  // Polling effect when an import is actively processing or queued
  useEffect(() => {
    const hasActiveProcessing = imports.some(
      (imp) => imp.status === 'processing' || imp.status === 'queued'
    );
    if (!hasActiveProcessing) return;

    const timer = setInterval(async () => {
      try {
        const res = await ingestionApi.getImports({ limit: 100 });
        setImports(res.items);
      } catch {}
    }, 3000);

    return () => clearInterval(timer);
  }, [imports]);

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const renderStatusBadge = (imp: PcapImport) => {
    switch (imp.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-sentra-cyan bg-sentra-cyan/15 px-2 py-0.5 rounded border border-sentra-cyan/30 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Streaming...
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Queued
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return <span className="font-mono text-xs text-slate-400">{imp.status}</span>;
    }
  };

  return (
    <div className="soc-card bg-background-surface/80 border border-border rounded-xl overflow-hidden space-y-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sentra-cyan" />
            Capture Ingestion Records
          </h4>
          <span className="text-xs text-slate-400">
            Historical audit of uploaded PCAP / PCAPNG telemetry files
          </span>
        </div>

        <button
          onClick={loadImports}
          className={`p-1.5 rounded bg-background-card border border-border text-slate-400 hover:text-sentra-cyan transition-colors ${
            loading ? 'animate-spin text-sentra-cyan' : ''
          }`}
          title="Refresh import list"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border-b border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-background-subtle/40 text-slate-400 uppercase tracking-wider text-[10px] font-mono">
              <th className="py-3 px-4 font-medium">Capture File</th>
              <th className="py-3 px-4 font-medium">Associated Asset</th>
              <th className="py-3 px-4 font-medium">File Size</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Packets</th>
              <th className="py-3 px-4 font-medium">Directional Flows</th>
              <th className="py-3 px-4 font-medium">Ingestion Time</th>
              <th className="py-3 px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {imports.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-xs text-slate-500">
                  {loading
                    ? 'Loading capture ingestion history...'
                    : 'No PCAP capture records found. Upload a capture file above to begin.'}
                </td>
              </tr>
            ) : (
              imports.map((imp) => (
                <tr key={imp.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-800 text-sentra-cyan">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-100">{imp.original_filename}</span>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          ID: #{imp.id}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    {imp.server_name ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-200">
                        <Server className="w-3 h-3 text-sentra-cyan" />
                        {imp.server_name}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">Unassigned / Tap Feed</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {formatFileSize(imp.file_size)}
                  </td>

                  <td className="py-3.5 px-4">
                    {renderStatusBadge(imp)}
                    {imp.error_message && (
                      <span className="block text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={imp.error_message}>
                        {imp.error_message}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-200">
                    {imp.total_packets.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-sentra-cyan font-semibold">
                    {imp.total_flows.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(imp.uploaded_at).toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {imp.total_flows > 0 && onSelectImportForFlows && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Layers className="w-3 h-3 text-sentra-cyan" />}
                        onClick={() => onSelectImportForFlows(imp.id)}
                      >
                        Explore Flows
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
