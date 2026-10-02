import React from 'react';
import { X, CheckCircle, AlertTriangle, Clock, FileSpreadsheet, ShieldAlert, Layers } from 'lucide-react';
import { FeatureJob } from '../../types';

interface JobDetailModalProps {
  job: FeatureJob | null;
  onClose: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose }) => {
  if (!job) return null;

  const report = job.quality_report;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Feature Extraction Audit Report — Job #{job.id}
              </h3>
              <p className="text-xs text-slate-400">
                Schema Version: <span className="text-indigo-400 font-mono font-medium">{job.schema_version}</span> • Import ID: #{job.import_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Status & Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Processing Status</span>
              <div className="flex items-center space-x-2 mt-1">
                {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {job.status === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                {job.status === 'processing' && <Clock className="w-4 h-4 text-amber-400 animate-spin" />}
                <span className="capitalize font-medium text-slate-200">{job.status}</span>
              </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Valid Flow Records</span>
              <p className="text-lg font-semibold text-emerald-400 mt-1">
                {job.valid_flows.toLocaleString()} <span className="text-xs text-slate-500 font-normal">/ {job.input_flows.toLocaleString()}</span>
              </p>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Generated Features</span>
              <p className="text-lg font-semibold text-indigo-400 mt-1">
                {job.generated_features} <span className="text-xs text-slate-500 font-normal">dimensions</span>
              </p>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Created At</span>
              <p className="text-xs font-mono text-slate-300 mt-2 truncate">
                {new Date(job.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Error Message if Failed */}
          {job.error_message && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start space-x-3 text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Extraction Failure Reason:</p>
                <p className="text-xs text-rose-200 mt-1 font-mono">{job.error_message}</p>
              </div>
            </div>
          )}

          {/* Quality Audit Report Section */}
          {report && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Data Quality & Integrity Audit</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-400">Total Input Flows</span>
                  <p className="text-base font-semibold text-slate-200">{report.total_input_records}</p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-400">Duplicates Pruned</span>
                  <p className="text-base font-semibold text-amber-400">{report.duplicate_records}</p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-400">Excluded (Corrupt)</span>
                  <p className="text-base font-semibold text-rose-400">{report.records_excluded}</p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-400">Integrity Pass Rate</span>
                  <p className="text-base font-semibold text-emerald-400">
                    {report.total_input_records > 0
                      ? `${Math.round((report.valid_records / report.total_input_records) * 100)}%`
                      : '0%'}
                  </p>
                </div>
              </div>

              {/* Exclusion Reasons */}
              {Object.keys(report.exclusion_reasons).length > 0 && (
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">Exclusion Breakdown:</span>
                  <div className="mt-2 space-y-1">
                    {Object.entries(report.exclusion_reasons).map(([reason, count]) => (
                      <div key={reason} className="flex justify-between text-xs py-1 border-b border-slate-800/80">
                        <span className="text-slate-400 font-mono">{reason}</span>
                        <span className="text-rose-400 font-medium">{count} flow(s)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Values Handled */}
              {Object.keys(report.missing_value_counts).length > 0 && (
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">Missing Values Handled & Imputed:</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(report.missing_value_counts).map(([col, count]) => (
                      <div key={col} className="flex justify-between text-xs bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 font-mono">{col}</span>
                        <span className="text-amber-400 font-medium">{count} imputed</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remediation Audit Actions */}
              {report.remediation_actions.length > 0 && (
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">Cleaning Log & Actions:</span>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-slate-400">
                    {report.remediation_actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
