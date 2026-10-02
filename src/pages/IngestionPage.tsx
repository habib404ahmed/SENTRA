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

      {/* Unidirectional Telemetry Pipeline Flow Diagram */}
      <div className="hud-bracket soc-card p-4.5 bg-background-surface/90 border border-border space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-sentra-cyan rounded-sm" />
            <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text">
              Unidirectional Telemetry Ingestion Pipeline
            </h3>
          </div>
          <span className="text-[10px] font-mono text-sentra-green bg-background px-2 py-0.5 rounded border border-sentra-green/30 font-bold uppercase">
            SIMPLEX ISOLATION
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2 relative">
          {/* Step 1 */}
          <div className="p-3 rounded bg-background border border-border relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-sentra-cyan font-bold">NODE 01</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sentra-green animate-pulse" />
            </div>
            <div className="text-xs font-mono font-bold text-text uppercase">1. Passive Ingress</div>
            <p className="text-[10px] font-mono text-text-muted mt-1 leading-snug">
              PCAP / PCAPNG or Optical Diode Tap. Zero transmit return-path.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3 rounded bg-background border border-border relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-sentra-cyan font-bold">NODE 02</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sentra-green animate-pulse" />
            </div>
            <div className="text-xs font-mono font-bold text-text uppercase">2. Flow Aggregation</div>
            <p className="text-[10px] font-mono text-text-muted mt-1 leading-snug">
              Unidirectional 5-tuple tracking (Src IP, Dst IP, Ports, Protocol).
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3 rounded bg-background border border-border relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-sentra-cyan font-bold">NODE 03</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sentra-green animate-pulse" />
            </div>
            <div className="text-xs font-mono font-bold text-text uppercase">3. Feature Vectors</div>
            <p className="text-[10px] font-mono text-text-muted mt-1 leading-snug">
              Extraction of packet sizes, inter-arrival times, window ratios.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3 rounded bg-background border border-sentra-cyan/40 relative shadow-[0_0_12px_rgba(0,229,255,0.15)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-sentra-cyan font-bold">NODE 04</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sentra-cyan animate-pulse" />
            </div>
            <div className="text-xs font-mono font-bold text-text uppercase">4. Threat Scoring</div>
            <p className="text-[10px] font-mono text-text-muted mt-1 leading-snug">
              Real-time classification against trained ML models & behavioral baselines.
            </p>
          </div>
        </div>

        <div className="pt-2 text-[10px] font-mono text-text-muted flex items-center justify-between border-t border-border/60">
          <span>* Physical hardware deployment operates via read-only diode. Cloud instances ingest authorized packet captures.</span>
          <span className="text-sentra-cyan font-semibold">100% PASSIVE TAP COMPLIANT</span>
        </div>
      </div>

      {/* Top 3 Real Ingestion Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="hud-bracket soc-card p-4 bg-background-surface/90 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Total PCAP Captures</span>
            <div className="p-1.5 rounded bg-background border border-border text-sentra-cyan">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text">{stats.totalFiles}</span>
            <span className="text-[10px] font-mono text-text-muted uppercase">Files Imported</span>
          </div>
        </div>

        <div className="hud-bracket soc-card p-4 bg-background-surface/90 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Ingested Packets</span>
            <div className="p-1.5 rounded bg-background border border-border text-sentra-green">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text">
              {stats.totalPackets.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-text-muted uppercase">Packets Parsed</span>
          </div>
        </div>

        <div className="hud-bracket soc-card p-4 bg-background-surface/90 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Directional Flows</span>
            <div className="p-1.5 rounded bg-background border border-border text-sentra-cyan">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text">
              {stats.totalFlows.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-text-muted uppercase">Flow Records</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 rounded bg-background border border-border max-w-md font-mono">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'upload'
              ? 'bg-background-card text-sentra-cyan border border-sentra-cyan/40 shadow-sm'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Upload & Ingest
        </button>

        <button
          onClick={() => setActiveTab('flows')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'flows'
              ? 'bg-background-card text-sentra-cyan border border-sentra-cyan/40 shadow-sm'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Flow Explorer
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'history'
              ? 'bg-background-card text-sentra-cyan border border-sentra-cyan/40 shadow-sm'
              : 'text-text-muted hover:text-text'
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
