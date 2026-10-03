import React from 'react';
import {
  FileBarChart,
  Shield,
  Activity,
  CheckCircle,
  X,
  Layers,
  Sliders,
  TrendingUp,
  Percent,
  AlertTriangle
} from 'lucide-react';
import { MLModel, MLEvaluation } from '../../types';

interface ModelEvaluationViewProps {
  model: MLModel;
  evaluation: MLEvaluation | null;
  loading: boolean;
  onClose: () => void;
}

export const ModelEvaluationView: React.FC<ModelEvaluationViewProps> = ({
  model,
  evaluation,
  loading,
  onClose
}) => {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading factual evaluation metrics for Model #{model.id}...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <p className="text-sm">No evaluation report available for this model.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
        >
          Back to Registry
        </button>
      </div>
    );
  }

  const { metrics, confusion_matrix, per_class_metrics, feature_importances } = evaluation;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-6 p-4 sm:p-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <FileBarChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">{model.name}</h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-indigo-500/20 text-indigo-300">
                {model.version}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Algorithm: <span className="text-slate-200 font-mono">{model.algorithm}</span> • Split: {evaluation.split_method} (Test: {evaluation.test_records} flows, {evaluation.test_size * 100}%)
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all self-start sm:self-auto flex items-center space-x-1"
        >
          <X className="w-4 h-4" />
          <span>Close Report</span>
        </button>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {model.model_type === 'classifier' ? (
          <>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Test Accuracy</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {metrics.accuracy !== undefined ? `${(metrics.accuracy * 100).toFixed(2)}%` : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Unbiased holdout test set</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Macro F1-Score</span>
              <p className="text-2xl font-bold text-indigo-400 mt-1">
                {metrics.macro_f1 !== undefined ? metrics.macro_f1.toFixed(4) : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Unweighted class average</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Macro Precision / Recall</span>
              <p className="text-lg font-bold text-slate-200 mt-1.5 font-mono">
                {metrics.macro_precision?.toFixed(3)} / {metrics.macro_recall?.toFixed(3)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Precision / Recall</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Normal Class FPR</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {metrics.normal_false_positive_rate !== undefined
                  ? `${(metrics.normal_false_positive_rate * 100).toFixed(2)}%`
                  : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">False alarm rate</span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Anomaly F1-Score</span>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {metrics.f1_score !== undefined ? metrics.f1_score.toFixed(4) : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Harmonic mean precision & recall</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">ROC-AUC Score</span>
              <p className="text-2xl font-bold text-indigo-400 mt-1">
                {metrics.roc_auc !== undefined && metrics.roc_auc !== null
                  ? metrics.roc_auc.toFixed(4)
                  : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Ranking discrimination index</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Precision / Recall</span>
              <p className="text-lg font-bold text-slate-200 mt-1.5 font-mono">
                {metrics.precision?.toFixed(3)} / {metrics.recall?.toFixed(3)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Anomaly detection fidelity</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">False Positive Rate</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {metrics.false_positive_rate !== undefined
                  ? `${(metrics.false_positive_rate * 100).toFixed(2)}%`
                  : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Benign flagged as anomaly</span>
            </div>
          </>
        )}
      </div>

      {/* Human-Readable Summary Banner */}
      {evaluation.report_summary && (
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-line">
          {evaluation.report_summary}
        </div>
      )}

      {/* Per-Class Breakdown Table (for Supervised Classifier) */}
      {per_class_metrics && Object.keys(per_class_metrics).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Per-Class Threat Detection Metrics</span>
          </h3>

          <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-800">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Threat Class</th>
                  <th className="py-2.5 px-4">Precision</th>
                  <th className="py-2.5 px-4">Recall</th>
                  <th className="py-2.5 px-4">F1-Score</th>
                  <th className="py-2.5 px-4 text-right">Holdout Support (Flows)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {Object.entries(per_class_metrics).map(([clsName, pcm]) => (
                  <tr key={clsName} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-semibold text-indigo-300">{clsName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-200">{(pcm.precision * 100).toFixed(2)}%</td>
                    <td className="py-2.5 px-4 font-mono text-slate-200">{(pcm.recall * 100).toFixed(2)}%</td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-emerald-400">
                      {(pcm.f1_score * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">{pcm.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confusion Matrix Heatmap */}
      {confusion_matrix && confusion_matrix.labels && confusion_matrix.matrix && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Empirical Confusion Matrix</span>
          </h3>

          <div className="p-3.5 sm:p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar">
            <div className="inline-block min-w-full">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-slate-500 font-normal italic">Actual \ Pred</th>
                    {confusion_matrix.labels.map((lbl) => (
                      <th key={lbl} className="p-2 font-mono text-indigo-300 text-center font-semibold">
                        {lbl}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {confusion_matrix.matrix.map((row, rowIdx) => {
                    const actualLabel = confusion_matrix.labels[rowIdx];
                    return (
                      <tr key={actualLabel}>
                        <td className="p-2 font-mono text-indigo-300 font-semibold">{actualLabel}</td>
                        {row.map((val, colIdx) => {
                          const isDiagonal = rowIdx === colIdx;
                          return (
                            <td
                              key={colIdx}
                              className={`p-3 font-mono text-center font-bold rounded-lg ${
                                isDiagonal
                                  ? val > 0
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-900 text-slate-500'
                                  : val > 0
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'text-slate-600'
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Feature Importances (Random Forest) */}
      {feature_importances && feature_importances.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Gini / MDI Feature Importances (Top 12 Drivers)</span>
            </h3>
            <span className="text-[11px] text-slate-500 italic">Model-specific heuristic ranking</span>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            {feature_importances.slice(0, 12).map((fi, idx) => {
              const maxImp = feature_importances[0].importance || 1.0;
              const barPercent = Math.min(100, Math.round((fi.importance / maxImp) * 100));

              return (
                <div key={fi.feature} className="flex items-center space-x-2 sm:space-x-3 text-xs">
                  <span className="w-5 text-slate-500 font-mono text-[10px] text-right">#{idx + 1}</span>
                  <span className="w-28 sm:w-48 font-mono text-slate-300 truncate" title={fi.feature}>
                    {fi.feature}
                  </span>
                  <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                  <span className="w-14 sm:w-16 font-mono text-indigo-400 text-right text-[11px]">
                    {(fi.importance * 100).toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
