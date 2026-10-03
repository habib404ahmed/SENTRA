import React from 'react';
import { Database, Plus, CheckCircle, FileText, Layers, RefreshCw } from 'lucide-react';
import { MLDataset } from '../../types';

interface DatasetRegistryTableProps {
  datasets: MLDataset[];
  loading: boolean;
  onGenerateBenchmark: () => void;
  generatingBenchmark: boolean;
}

export const DatasetRegistryTable: React.FC<DatasetRegistryTableProps> = ({
  datasets,
  loading,
  onGenerateBenchmark,
  generatingBenchmark
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Registered ML Datasets</h3>
            <p className="text-xs text-slate-400">Validated against SENTRA v1.0.0 Feature Schema</p>
          </div>
        </div>

        <button
          onClick={onGenerateBenchmark}
          disabled={generatingBenchmark}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          {generatingBenchmark ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Generating Benchmark...</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Benchmark Dataset</span>
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              <th className="py-3 px-4">Dataset ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Source Provenance</th>
              <th className="py-3 px-3">Format</th>
              <th className="py-3 px-3">Flow Records</th>
              <th className="py-3 px-3">Class Count</th>
              <th className="py-3 px-4">Represented Threat Classes</th>
              <th className="py-3 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {datasets.map((ds) => (
              <tr key={ds.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-slate-200">#{ds.id}</td>
                <td className="py-3 px-4 font-semibold text-white truncate max-w-xs">{ds.name}</td>
                <td className="py-3 px-4 text-slate-300">{ds.source}</td>
                <td className="py-3 px-3 font-mono uppercase text-[10px] text-indigo-400 font-bold">{ds.format}</td>
                <td className="py-3 px-3 font-mono font-semibold text-slate-200">{ds.record_count.toLocaleString()}</td>
                <td className="py-3 px-3 font-mono text-slate-300">{ds.class_count} classes</td>
                <td className="py-3 px-4 text-slate-300 truncate max-w-xs" title={ds.classes.join(', ')}>
                  {ds.classes.join(', ')}
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {ds.validation_status}
                  </span>
                </td>
              </tr>
            ))}
            {datasets.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No datasets registered yet. Click "Generate Benchmark Dataset" to synthesize a multi-class dataset.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
