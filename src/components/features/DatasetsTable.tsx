import React from 'react';
import { Download, FileSpreadsheet, HardDrive, Check, Hash } from 'lucide-react';
import { FeatureDataset } from '../../types';

interface DatasetsTableProps {
  datasets: FeatureDataset[];
  loading: boolean;
  onDownload: (dataset: FeatureDataset) => void;
}

export const DatasetsTable: React.FC<DatasetsTableProps> = ({ datasets, loading, onDownload }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Generated Dataset Artifacts</h3>
          <span className="text-xs text-slate-400">({datasets.length} available)</span>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
            <tr>
              <th className="py-3 px-4">Dataset Name</th>
              <th className="py-3 px-3">Format</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Dimensions</th>
              <th className="py-3 px-3">File Size</th>
              <th className="py-3 px-4">SHA-256 Digest</th>
              <th className="py-3 px-4 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {datasets.map((d) => (
              <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-slate-200 truncate max-w-xs" title={d.name}>
                  {d.name}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      d.format === 'parquet'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {d.format}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-slate-300">
                    {d.dataset_type === 'unlabeled_ml_ready' ? (
                      <span className="text-indigo-400 font-medium">Unlabeled ML Matrix</span>
                    ) : (
                      <span className="text-slate-400">Full Audited</span>
                    )}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">
                  {d.row_count} rows × {d.column_count} cols
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">{formatBytes(d.file_size)}</td>
                <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-xs truncate" title={d.sha256_hash || ''}>
                  {d.sha256_hash ? `${d.sha256_hash.slice(0, 16)}...` : 'N/A'}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onDownload(d)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </td>
              </tr>
            ))}
            {datasets.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No datasets generated yet. Run feature extraction to produce CSV and Parquet files.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
