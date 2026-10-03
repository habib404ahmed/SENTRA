import React from 'react';
import { CheckCircle, AlertTriangle, Clock, Eye, Layers } from 'lucide-react';
import { FeatureJob } from '../../types';

interface JobHistoryTableProps {
  jobs: FeatureJob[];
  loading: boolean;
  onViewJob: (job: FeatureJob) => void;
}

export const JobHistoryTable: React.FC<JobHistoryTableProps> = ({ jobs, loading, onViewJob }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            Processing
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
      <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Feature Extraction Jobs</h3>
          <span className="text-xs text-slate-400">({jobs.length} total)</span>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              <th className="py-3 px-4">Job ID</th>
              <th className="py-3 px-4">Import Ref</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Valid Flows / Input</th>
              <th className="py-3 px-4">Extracted Dimensions</th>
              <th className="py-3 px-4">Schema</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Audit Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-slate-200">#{j.id}</td>
                <td className="py-3 px-4 font-mono text-indigo-400">Import #{j.import_id}</td>
                <td className="py-3 px-4">{getStatusBadge(j.status)}</td>
                <td className="py-3 px-4 text-slate-300">
                  <span className="font-semibold text-emerald-400">{j.valid_flows}</span>
                  <span className="text-slate-500"> / {j.input_flows}</span>
                </td>
                <td className="py-3 px-4 font-semibold text-indigo-300">{j.generated_features} features</td>
                <td className="py-3 px-4 font-mono text-slate-400">{j.schema_version}</td>
                <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                  {new Date(j.created_at).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onViewJob(j)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-xs font-medium transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Quality Audit</span>
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No feature extraction jobs recorded yet. Click "Start Feature Extraction" to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
