import React from 'react';
import { Clock, CheckCircle, AlertTriangle, Cpu, Play } from 'lucide-react';
import { MLTrainingJob } from '../../types';

interface TrainingJobsTableProps {
  jobs: MLTrainingJob[];
  loading: boolean;
  onSelectModel?: (modelId: number) => void;
}

export const TrainingJobsTable: React.FC<TrainingJobsTableProps> = ({ jobs, loading, onSelectModel }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'training':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            Training
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Queued
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Training Job History</h3>
          <span className="text-xs text-slate-400">({jobs.length} jobs)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              <th className="py-3 px-4">Job ID</th>
              <th className="py-3 px-4">Dataset</th>
              <th className="py-3 px-3">Architecture</th>
              <th className="py-3 px-3">Algorithm</th>
              <th className="py-3 px-4">Hyperparameters</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Output Model</th>
              <th className="py-3 px-4 text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-slate-200">#{j.id}</td>
                <td className="py-3 px-4 font-mono text-indigo-400">Dataset #{j.dataset_id}</td>
                <td className="py-3 px-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    j.model_type === 'classifier'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}>
                    {j.model_type}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">{j.algorithm}</td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-xs" title={JSON.stringify(j.hyperparameters)}>
                  {Object.entries(j.hyperparameters).map(([k, v]) => `${k}=${v}`).join(', ')}
                </td>
                <td className="py-3 px-4">{getStatusBadge(j.status)}</td>
                <td className="py-3 px-4 font-mono">
                  {j.output_model_id ? (
                    <button
                      onClick={() => onSelectModel?.(j.output_model_id!)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
                    >
                      Model #{j.output_model_id}
                    </button>
                  ) : j.status === 'failed' ? (
                    <span className="text-rose-400 text-[11px] truncate max-w-xs block" title={j.error_message || ''}>
                      {j.error_message || 'Error'}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                  {new Date(j.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No training jobs recorded. Click "Train Model" to start a training execution.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
