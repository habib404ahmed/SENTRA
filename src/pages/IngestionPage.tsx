import React, { useState, useEffect } from 'react';
import { PcapUploadCard } from '@/components/ingestion/PcapUploadCard';
import { ImportHistoryTable } from '@/components/ingestion/ImportHistoryTable';
import { FlowExplorer } from '@/components/ingestion/FlowExplorer';
import { ingestionApi } from '@/services/ingestion';
import { flowsApi } from '@/services/flows';
import { PcapImport } from '@/types';
import { 
  UploadCloud, 
  Layers, 
  FileText, 
  Activity, 
  ShieldCheck, 
  Database,
  ArrowRight,
  Radio
} from 'lucide-react';

export const IngestionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'flows'>('upload');
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Global Ingestion Stats
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalPackets: 0,
    totalFlows: 0,
  });

  const loadStats = async () => {
    try {
      const [importsRes, flowsRes] = await Promise.all([
        ingestionApi.getImports({ limit: 100 }),
        flowsApi.getFlows({ limit: 1 }),
      ]);
      const totalPkts = importsRes.items.reduce((sum, item) => sum + (item.total_packets || 0), 0);
      setStats({
        totalFiles: importsRes.total,
        totalPackets: totalPkts,
        totalFlows: flowsRes.total,
      });
    } catch {}
  };

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const handleUploadSuccess = (imported: PcapImport) => {
    setRefreshTrigger((prev) => prev + 1);
    // Optionally stay on tab or show history
    setSelectedImportId(imported.id);
  };

  const handleSelectImportForFlows = (importId: number) => {
    setSelectedImportId(importId);
    setActiveTab('flows');
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Operational Mode Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-sentra-cyan animate-pulse" />
            Network Traffic Ingestion & PCAP Processing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload authorized PCAP / PCAPNG packet captures for streaming ingestion, unidirectional 5-tuple flow aggregation, and telemetry extraction.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto font-mono text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Unidirectional Flow Ingestion
          </span>
        </div>
      </div>

      {/* Top 3 Real Ingestion Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="soc-card p-4 bg-background-surface/90 border border-border rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total PCAP Captures</span>
            <div className="p-2 rounded bg-slate-800 text-sentra-cyan">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{stats.totalFiles}</span>
            <span className="text-[11px] font-mono text-slate-500">files imported</span>
          </div>
        </div>

        <div className="soc-card p-4 bg-background-surface/90 border border-border rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Ingested Packets</span>
            <div className="p-2 rounded bg-slate-800 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {stats.totalPackets.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-slate-500">packets parsed</span>
          </div>
        </div>

        <div className="soc-card p-4 bg-background-surface/90 border border-border rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Directional Flows</span>
            <div className="p-2 rounded bg-slate-800 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {stats.totalFlows.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-slate-500">forward records</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-background-card border border-border max-w-md">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-slate-800 text-sentra-cyan shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Upload & Ingest
        </button>

        <button
          onClick={() => setActiveTab('flows')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'flows'
              ? 'bg-slate-800 text-sentra-cyan shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Flow Explorer
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-slate-800 text-sentra-cyan shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Import History
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'upload' && (
        <div className="space-y-5">
          <PcapUploadCard onUploadSuccess={handleUploadSuccess} />
          <ImportHistoryTable
            onSelectImportForFlows={handleSelectImportForFlows}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {activeTab === 'flows' && (
        <FlowExplorer initialImportId={selectedImportId} />
      )}

      {activeTab === 'history' && (
        <ImportHistoryTable
          onSelectImportForFlows={handleSelectImportForFlows}
          refreshTrigger={refreshTrigger}
        />
      )}
    </div>
  );
};
