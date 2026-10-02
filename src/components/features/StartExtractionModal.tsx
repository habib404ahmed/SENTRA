import React, { useState } from 'react';
import { X, Play, Clock, FileCheck, Layers, AlertCircle } from 'lucide-react';
import { PcapImport } from '../../types';

interface StartExtractionModalProps {
  imports: PcapImport[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (importId: number, windowSeconds: number) => Promise<void>;
  loading: boolean;
}

export const StartExtractionModal: React.FC<StartExtractionModalProps> = ({
  imports,
  isOpen,
  onClose,
  onSubmit,
  loading
}) => {
  const completedImports = imports.filter((imp) => imp.status === 'completed' && imp.total_flows > 0);
  const [selectedImportId, setSelectedImportId] = useState<number>(
    completedImports.length > 0 ? completedImports[0].id : 0
  );
  const [windowSeconds, setWindowSeconds] = useState<number>(300.0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImportId) {
      setError('Please select an authorized completed PCAP import.');
      return;
    }
    setError(null);
    try {
      await onSubmit(selectedImportId, windowSeconds);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to start feature extraction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Start Feature Extraction</h3>
              <p className="text-xs text-slate-400">Generate numerical dataset from directional flows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Ingested PCAP Capture
            </label>
            {completedImports.length > 0 ? (
              <select
                value={selectedImportId}
                onChange={(e) => setSelectedImportId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {completedImports.map((imp) => (
                  <option key={imp.id} value={imp.id}>
                    Import #{imp.id} — {imp.original_filename} ({imp.total_flows} flows, {imp.total_packets} pkts)
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                No completed PCAP captures with traffic flows available. Upload a PCAP in Traffic Ingestion first.
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Behavioral Retrospective Window
              </label>
              <span className="text-xs font-mono text-indigo-400">{windowSeconds}s</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[60, 300, 600].map((sec) => (
                <button
                  type="button"
                  key={sec}
                  onClick={() => setWindowSeconds(sec)}
                  className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                    windowSeconds === sec
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec} seconds ({sec / 60}m)
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Configures the backward-looking time window [t - W, t] for fan-out and connection frequency calculations. Prevents future data leakage.
            </p>
          </div>

          {/* Info callout */}
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
              <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pipeline Output Artifacts:</span>
            </div>
            <p>• Unlabeled ML-ready CSV dataset (strictly features, 0 identifier columns)</p>
            <p>• Full Analyzed CSV dataset (with audit 5-tuples and flow IDs)</p>
            <p>• Fast binary Parquet format with SHA-256 verification</p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || completedImports.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Extraction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
