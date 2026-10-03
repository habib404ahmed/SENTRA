import React, { useState } from 'react';
import { X, Play, RefreshCw, AlertTriangle, ShieldCheck, Activity, Cpu } from 'lucide-react';
import type { MLModel, MLPredictResponse } from '../../types';
import { mlApi } from '../../services/ml';

interface InferencePlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: MLModel | null;
}

const PRESETS: Record<string, Record<string, number>> = {
  'Normal Web Traffic': {
    duration_sec: 15.2,
    packet_count: 45,
    byte_count: 24500,
    mean_packet_size: 544.4,
    std_packet_size: 412.1,
    min_packet_size: 64,
    max_packet_size: 1514,
    packets_per_second: 2.96,
    bytes_per_second: 1611.8,
    syn_count: 1,
    ack_count: 44,
    rst_count: 0,
    fin_count: 1,
    psh_count: 22,
    syn_ratio: 0.022,
    tcp_handshake_completed: 1,
    dns_query_count: 0,
    dns_txt_record_count: 0,
    flow_entropy: 5.4,
  },
  'SYN Flood (DDoS)': {
    duration_sec: 2.0,
    packet_count: 850,
    byte_count: 45900,
    mean_packet_size: 54.0,
    std_packet_size: 2.0,
    min_packet_size: 54,
    max_packet_size: 60,
    packets_per_second: 425.0,
    bytes_per_second: 22950.0,
    syn_count: 850,
    ack_count: 0,
    rst_count: 0,
    fin_count: 0,
    psh_count: 0,
    syn_ratio: 1.0,
    tcp_handshake_completed: 0,
    dns_query_count: 0,
    dns_txt_record_count: 0,
    flow_entropy: 1.8,
  },
  'Port Scan (Reconnaissance)': {
    duration_sec: 0.1,
    packet_count: 2,
    byte_count: 120,
    mean_packet_size: 60.0,
    std_packet_size: 0.0,
    min_packet_size: 60,
    max_packet_size: 60,
    packets_per_second: 20.0,
    bytes_per_second: 1200.0,
    syn_count: 2,
    ack_count: 0,
    rst_count: 0,
    fin_count: 0,
    psh_count: 0,
    syn_ratio: 1.0,
    tcp_handshake_completed: 0,
    dns_query_count: 0,
    dns_txt_record_count: 0,
    flow_entropy: 2.1,
  },
  'DNS Tunneling (Exfiltration)': {
    duration_sec: 45.0,
    packet_count: 120,
    byte_count: 48000,
    mean_packet_size: 400.0,
    std_packet_size: 28.0,
    min_packet_size: 250,
    max_packet_size: 512,
    packets_per_second: 2.67,
    bytes_per_second: 1066.6,
    syn_count: 0,
    ack_count: 0,
    rst_count: 0,
    fin_count: 0,
    psh_count: 0,
    syn_ratio: 0.0,
    tcp_handshake_completed: 0,
    dns_query_count: 120,
    dns_txt_record_count: 110,
    flow_entropy: 7.9,
  },
  'Bulk Data Exfiltration': {
    duration_sec: 32.0,
    packet_count: 3200,
    byte_count: 4800000,
    mean_packet_size: 1500.0,
    std_packet_size: 45.0,
    min_packet_size: 64,
    max_packet_size: 1514,
    packets_per_second: 100.0,
    bytes_per_second: 150000.0,
    syn_count: 1,
    ack_count: 3190,
    rst_count: 0,
    fin_count: 1,
    psh_count: 2900,
    syn_ratio: 0.0003,
    tcp_handshake_completed: 1,
    dns_query_count: 0,
    dns_txt_record_count: 0,
    flow_entropy: 7.6,
  },
};

export const InferencePlaygroundModal: React.FC<InferencePlaygroundModalProps> = ({
  isOpen,
  onClose,
  model,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('Normal Web Traffic');
  const [features, setFeatures] = useState<Record<string, number>>({
    ...PRESETS['Normal Web Traffic'],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MLPredictResponse | null>(null);

  if (!isOpen || !model) return null;

  const handlePresetChange = (name: string) => {
    setSelectedPreset(name);
    setFeatures({ ...PRESETS[name] });
    setResult(null);
    setError(null);
  };

  const handleFeatureChange = (key: string, value: string) => {
    const num = parseFloat(value);
    setFeatures((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num,
    }));
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const pred = await mlApi.predictFlow(model.id, features);
      setResult(pred);
    } catch (err: any) {
      setError(err.message || 'Inference failed');
    } finally {
      setLoading(false);
    }
  };

  const isClassifier = model.model_type === 'classifier';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white flex flex-wrap items-center gap-2">
                <span>Inference Playground</span>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {model.version}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Target Model: <span className="text-slate-200 font-medium">{model.name}</span> ({isClassifier ? 'Random Forest' : 'Isolation Forest'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Load Traffic Flow Signature Preset
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((presetName) => (
                <button
                  key={presetName}
                  type="button"
                  onClick={() => handlePresetChange(presetName)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                    selectedPreset === presetName
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/30'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {presetName}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handlePredict} className="space-y-6">
            {/* Input Vector Matrix */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Unidirectional Flow Features (Schema {model.feature_schema_version})
                </label>
                <span className="text-xs text-slate-500">
                  {Object.keys(features).length} numerical attributes
                </span>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800/80">
                {Object.entries(features).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-[11px] font-mono text-slate-400 truncate" title={key}>
                      {key}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => handleFeatureChange(key, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Prediction Failed</p>
                  <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Prediction Output Card */}
            {result && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Live Model Inference Output
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Schema {result.feature_schema_version}
                  </span>
                </div>

                {isClassifier ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 gap-4">
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          Predicted Threat Class
                        </span>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`text-xl font-bold ${
                              result.predicted_class === 'Normal'
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {result.predicted_class}
                          </span>
                          {result.predicted_class === 'Normal' ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Benign
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Malicious
                            </span>
                          )}
                        </div>
                      </div>
                      {result.confidence !== undefined && result.confidence !== null && (
                        <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                            Class Likelihood / Vote Share
                          </span>
                          <div className="text-xl font-bold font-mono text-white mt-1">
                            {(result.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Class Probability Distribution */}
                    {result.class_probabilities && Object.keys(result.class_probabilities).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-400">
                          Ensemble Probability Distribution
                        </span>
                        <div className="space-y-2">
                          {Object.entries(result.class_probabilities).map(([cls, prob]) => {
                            const numProb = Number(prob);
                            const pct = (numProb * 100).toFixed(1);
                            const isPredicted = cls === result.predicted_class;
                            return (
                              <div key={cls} className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                  <span className={isPredicted ? 'text-purple-300 font-bold' : 'text-slate-400'}>
                                    {cls} {isPredicted && '✓'}
                                  </span>
                                  <span className={isPredicted ? 'text-purple-300 font-bold' : 'text-slate-400'}>
                                    {pct}%
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      cls === 'Normal'
                                        ? 'bg-emerald-500'
                                        : isPredicted
                                        ? 'bg-rose-500'
                                        : 'bg-purple-600'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Anomaly Detector Output */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          Verdict
                        </span>
                        <div className="mt-1">
                          {result.is_anomaly ? (
                            <span className="text-base font-bold text-rose-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" /> Anomaly Flagged
                            </span>
                          ) : (
                            <span className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4" /> Inlier (Normal Profile)
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          Isolation Score
                        </span>
                        <div className="text-base font-mono font-bold text-white mt-1">
                          {result.anomaly_score?.toFixed(4)}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Negative = higher isolation
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          Decision Threshold
                        </span>
                        <div className="text-base font-mono font-bold text-slate-300 mt-1">
                          {result.threshold?.toFixed(4) || '0.0000'}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Calibrated contamination boundary
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300">Scientific Context Note:</p>
                      <p>
                        Isolation Forest scores reflect average path length in isolation trees.
                        An anomaly indicates statistical dissimilarity from the normal traffic baseline,
                        not necessarily proof of malicious intent.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Inference...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Model Inference
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
