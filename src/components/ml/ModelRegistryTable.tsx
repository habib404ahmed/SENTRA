import React from 'react';
import { Brain, FileBarChart, PlayCircle, Shield, Activity, CheckCircle } from 'lucide-react';
import { MLModel } from '../../types';

interface ModelRegistryTableProps {
  models: MLModel[];
  loading: boolean;
  onViewEvaluation: (model: MLModel) => void;
  onOpenInference: (model: MLModel) => void;
}

export const ModelRegistryTable: React.FC<ModelRegistryTableProps> = ({
  models,
  loading,
  onViewEvaluation,
  onOpenInference
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Registered Model Artifacts</h3>
          <span className="text-xs text-slate-400">({models.length} models)</span>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              <th className="py-3 px-4">Model ID</th>
              <th className="py-3 px-4">Model Name</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Algorithm</th>
              <th className="py-3 px-3">Version</th>
              <th className="py-3 px-4">Threat Classes / Scope</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {models.map((m) => (
              <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-slate-200">#{m.id}</td>
                <td className="py-3 px-4 font-medium text-white truncate max-w-xs">{m.name}</td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      m.model_type === 'classifier'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    }`}
                  >
                    {m.model_type === 'classifier' ? (
                      <Shield className="w-3 h-3 mr-1" />
                    ) : (
                      <Activity className="w-3 h-3 mr-1" />
                    )}
                    {m.model_type}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">{m.algorithm}</td>
                <td className="py-3 px-3 font-mono text-indigo-400 font-medium">{m.version}</td>
                <td className="py-3 px-4 text-slate-300 truncate max-w-xs" title={m.classes?.join(', ') || ''}>
                  {m.classes && m.classes.length > 0 ? (
                    <span>{m.classes.join(', ')}</span>
                  ) : (
                    <span className="text-slate-500">Unsupervised</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {m.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onViewEvaluation(m)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-xs font-medium transition-all"
                      title="Inspect Factual Evaluation Metrics"
                    >
                      <FileBarChart className="w-3.5 h-3.5" />
                      <span>Evaluation</span>
                    </button>

                    <button
                      onClick={() => onOpenInference(m)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium transition-all"
                      title="Run Live Flow Inference"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Test Flow</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {models.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No models registered yet. Train a model from the Model Training tab to populate the registry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
