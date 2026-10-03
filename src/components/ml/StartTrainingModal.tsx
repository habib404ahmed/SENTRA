import React, { useState } from 'react';
import { X, Play, Brain, Sliders, AlertCircle, Shield, Activity } from 'lucide-react';
import { MLDataset, MLModelType } from '../../types';

interface StartTrainingModalProps {
  datasets: MLDataset[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    dataset_id: number;
    model_type: MLModelType;
    n_estimators: number;
    max_depth?: number;
    contamination?: number;
    class_weight?: string;
    random_state: number;
  }) => Promise<void>;
  loading: boolean;
}

export const StartTrainingModal: React.FC<StartTrainingModalProps> = ({
  datasets,
  isOpen,
  onClose,
  onSubmit,
  loading
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number>(
    datasets.length > 0 ? datasets[0].id : 0
  );
  const [modelType, setModelType] = useState<MLModelType>('classifier');
  const [nEstimators, setNEstimators] = useState<number>(100);
  const [maxDepth, setMaxDepth] = useState<number>(15);
  const [contamination, setContamination] = useState<number>(0.05);
  const [classWeight, setClassWeight] = useState<string>('balanced');
  const [randomState, setRandomState] = useState<number>(42);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      setError('Please select a registered dataset.');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        dataset_id: selectedDatasetId,
        model_type: modelType,
        n_estimators: nEstimators,
        max_depth: modelType === 'classifier' ? maxDepth : undefined,
        contamination: modelType === 'anomaly_detector' ? contamination : undefined,
        class_weight: modelType === 'classifier' ? classWeight : undefined,
        random_state: randomState
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch training job.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Train Machine Learning Model</h3>
              <p className="text-xs text-slate-400">Supervised classification or unsupervised anomaly detection</p>
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Model Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Model Architecture</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModelType('classifier')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  modelType === 'classifier'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold">Random Forest</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Multi-Class Threat Classifier (DDoS, Recon, Exfil, Tunneling)</p>
              </button>

              <button
                type="button"
                onClick={() => setModelType('anomaly_detector')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  modelType === 'anomaly_detector'
                    ? 'bg-purple-600/15 border-purple-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold">Isolation Forest</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Unsupervised Anomaly Detector (Zero-Day Statistical Outliers)</p>
              </button>
            </div>
          </div>

          {/* Dataset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Training Dataset</label>
            {datasets.length > 0 ? (
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    #{ds.id} — {ds.name} ({ds.record_count} flows, {ds.class_count} classes)
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                No datasets registered yet. Generate a benchmark dataset from the Datasets tab.
              </div>
            )}
          </div>

          {/* Hyperparameter Inputs */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Model Hyperparameters</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Trees (n_estimators)</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={nEstimators}
                  onChange={(e) => setNEstimators(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {modelType === 'classifier' ? (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Max Depth</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Contamination Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.5"
                    value={contamination}
                    onChange={(e) => setContamination(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Random Seed</label>
                <input
                  type="number"
                  value={randomState}
                  onChange={(e) => setRandomState(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {modelType === 'classifier' && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Class Weights</label>
                  <select
                    value={classWeight}
                    onChange={(e) => setClassWeight(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="balanced">Balanced (Inverse Frequency)</option>
                    <option value="none">None (Uniform)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || datasets.length === 0}
              className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Job...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Training Job</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
