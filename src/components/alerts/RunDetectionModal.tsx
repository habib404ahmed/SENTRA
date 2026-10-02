import React, { useState, useEffect } from 'react';
import { X, Play, RefreshCw, ShieldAlert, Cpu, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { PcapImport } from '@/types';
import { ingestionApi } from '@/services/ingestion';
import { alertsApi } from '@/services/alerts';

interface RunDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetectionStarted?: () => void;
}

export const RunDetectionModal: React.FC<RunDetectionModalProps> = ({
  isOpen,
  onClose,
  onDetectionStarted,
}) => {
  const [imports, setImports] = useState<PcapImport[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<number | undefined>(undefined);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.55);
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(-0.02);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchImports = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ingestionApi.getImports({ limit: 50 });
        const completed = res.items.filter(i => i.status === 'completed' && i.total_flows > 0);
        setImports(completed);
        if (completed.length > 0 && selectedImportId === undefined) {
          setSelectedImportId(completed[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load PCAP imports.');
      } finally {
        setLoading(false);
      }
    };
    fetchImports();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImportId) {
      setError('Please select an authorized capture file to analyze.');
      return;
    }

    setStarting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const job = await alertsApi.runDetection({
        import_id: selectedImportId,
        confidence_threshold: confidenceThreshold,
        anomaly_threshold: anomalyThreshold,
      });
      setSuccessMsg(`Detection Job #${job.id} dispatched successfully. Processing ${job.total_flows} flows in background...`);
      if (onDetectionStarted) {
        onDetectionStarted();
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to launch threat detection job.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Launch AI Threat Detection
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Run trained Random Forest & Isolation Forest inference on directional flows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleRun} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* PCAP Import Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Select Capture Input (Directional Flows)
            </label>
            {loading ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Loading ingested capture files...
              </div>
            ) : imports.length === 0 ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400">
                No completed PCAP imports with aggregated flows found. Upload a capture first in Traffic Ingestion.
              </div>
            ) : (
              <select
                value={selectedImportId || ''}
                onChange={(e) => setSelectedImportId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              >
                {imports.map((imp) => (
                  <option key={imp.id} value={imp.id}>
                    Import #{imp.id} — {imp.original_filename} ({imp.total_flows} directional flows, {imp.total_packets} packets)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Configuration Sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Classifier Vote Share Threshold</span>
                <span className="font-mono text-rose-400">{(confidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-rose-500"
              />
              <span className="text-[11px] text-slate-500 block">
                Minimum ensemble consensus required before raising a supervised signature alert.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Anomaly Isolation Threshold</span>
                <span className="font-mono text-amber-400">{anomalyThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-0.15"
                max="0.05"
                step="0.01"
                value={anomalyThreshold}
                onChange={(e) => setAnomalyThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[11px] text-slate-500 block">
                Decision boundary for flagging statistical structural dissimilarity from baseline.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={starting || loading || imports.length === 0}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {starting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Dispatching Detection...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Detection Pipeline
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
