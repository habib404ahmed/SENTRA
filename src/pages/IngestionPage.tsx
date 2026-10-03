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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-sentra-cyan" />
            Network Traffic Ingestion & PCAP Processing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload authorized PCAP / PCAPNG packet captures for streaming ingestion, unidirectional 5-tuple flow aggregation, and telemetry extraction.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-2.5 py-1 rounded bg-sentra-green/10 border border-sentra-green/25 text-sentra-green text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Unidirectional Flow Ingestion
          </span>
        </div>
      </div>

      {/* Telemetry Pipeline Overview */}
      <div className="soc-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Unidirectional Telemetry Ingestion Pipeline
          </h3>
          <span className="text-[10px] font-mono text-sentra-green bg-sentra-green/10 px-2 py-0.5 rounded border border-sentra-green/30 font-semibold uppercase">
            SIMPLEX ISOLATION
          </span>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2.5">
          {[{
            num: '01', label: '1. Passive Ingress',
            desc: 'PCAP / PCAPNG or Optical Diode Tap. Zero transmit return-path.',
            accent: false
          }, {
            num: '02', label: '2. Flow Aggregation',
            desc: 'Unidirectional 5-tuple tracking (Src IP, Dst IP, Ports, Protocol).',
            accent: false
          }, {
            num: '03', label: '3. Feature Vectors',
            desc: 'Extraction of packet sizes, inter-arrival times, window ratios.',
            accent: false
          }, {
            num: '04', label: '4. Threat Scoring',
            desc: 'Real-time classification against trained ML models & behavioral baselines.',
            accent: true
          }].map((step) => (
            <div
              key={step.num}
              className={`p-3 rounded border ${
                step.accent
                  ? 'bg-sentra-cyan/5 border-sentra-cyan/30'
                  : 'bg-background border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono text-sentra-cyan font-semibold">NODE {step.num}</span>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  step.accent ? 'bg-sentra-cyan' : 'bg-sentra-green'
                }`} />
              </div>
              <div className="text-xs font-semibold text-slate-200 mb-1">{step.label}</div>
              <p className="text-[10px] text-slate-400 leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 text-[10px] text-slate-500 flex flex-col sm:flex-row gap-1 sm:items-center justify-between border-t border-border">
          <span>Physical deployment: read-only diode. Cloud: authorized packet captures.</span>
          <span className="text-sentra-cyan font-semibold">100% PASSIVE TAP COMPLIANT</span>
        </div>
      </div>

      {/* Ingestion Metrics */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="soc-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total PCAP Captures</span>
            <div className="p-1.5 rounded bg-background border border-border text-sentra-cyan">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">{stats.totalFiles}</span>
            <span className="text-[10px] text-slate-400">Files Imported</span>
          </div>
        </div>

        <div className="soc-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Ingested Packets</span>
            <div className="p-1.5 rounded bg-background border border-border text-sentra-green">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {stats.totalPackets.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">Packets Parsed</span>
          </div>
        </div>

        <div className="soc-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Directional Flows</span>
            <div className="p-1.5 rounded bg-background border border-border text-sentra-cyan">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {stats.totalFlows.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">Flow Records</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto custom-scrollbar whitespace-nowrap -mx-1 px-1">
        {[
          { id: 'upload' as const, icon: <UploadCloud className="w-3.5 h-3.5" />, label: 'Upload & Ingest' },
          { id: 'flows' as const, icon: <Layers className="w-3.5 h-3.5" />, label: 'Flow Explorer' },
          { id: 'history' as const, icon: <FileText className="w-3.5 h-3.5" />, label: 'Import History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 mr-4 text-xs font-semibold flex items-center gap-2 transition-all shrink-0 touch-manipulation ${
              activeTab === tab.id
                ? 'text-sentra-cyan border-b-2 border-sentra-cyan'
                : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
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
