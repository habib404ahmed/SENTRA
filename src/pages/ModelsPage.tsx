import React, { useState, useEffect } from 'react';
import {
  Brain,
  Cpu,
  Database,
  BarChart3,
  Play,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type {
  MLModel,
  MLTrainingJob,
  MLDataset,
  MLEvaluation,
  MLModelType,
} from '../types';
import { mlApi } from '../services/ml';

import { ModelRegistryTable } from '../components/ml/ModelRegistryTable';
import { TrainingJobsTable } from '../components/ml/TrainingJobsTable';
import { DatasetRegistryTable } from '../components/ml/DatasetRegistryTable';
import { ModelEvaluationView } from '../components/ml/ModelEvaluationView';
import { StartTrainingModal } from '../components/ml/StartTrainingModal';
import { InferencePlaygroundModal } from '../components/ml/InferencePlaygroundModal';

export const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<MLModel[]>([]);
  const [jobs, setJobs] = useState<MLTrainingJob[]>([]);
  const [datasets, setDatasets] = useState<MLDataset[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'models' | 'jobs' | 'datasets' | 'evaluation'>('models');

  // Selected state for evaluation view
  const [selectedModelForEval, setSelectedModelForEval] = useState<MLModel | null>(null);
  const [evaluationData, setEvaluationData] = useState<MLEvaluation | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  // Modals
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(false);
  const [isStartingTraining, setIsStartingTraining] = useState(false);
  const [isGeneratingBenchmark, setIsGeneratingBenchmark] = useState(false);
  const [inferenceModel, setInferenceModel] = useState<MLModel | null>(null);

  // Notification banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      const [modelsRes, jobsRes, datasetsRes] = await Promise.all([
        mlApi.getModels(),
        mlApi.getTrainingJobs(),
        mlApi.getDatasets(),
      ]);
      setModels(modelsRes.items);
      setJobs(jobsRes.items);
      setDatasets(datasetsRes.items);

      // Default selected model for evaluation if not set yet
      if (!selectedModelForEval && modelsRes.items.length > 0) {
        setSelectedModelForEval(modelsRes.items[0]);
      }
    } catch (err: any) {
      console.error('Failed to load ML engine data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll active training jobs
  useEffect(() => {
    const hasActiveJob = jobs.some((j) => j.status === 'queued' || j.status === 'training');
    if (!hasActiveJob) return;

    const interval = setInterval(async () => {
      try {
        const [modelsRes, jobsRes] = await Promise.all([
          mlApi.getModels(),
          mlApi.getTrainingJobs(),
        ]);
        setModels(modelsRes.items);
        setJobs(jobsRes.items);
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  // Load evaluation data when selected model changes
  useEffect(() => {
    if (!selectedModelForEval) {
      setEvaluationData(null);
      return;
    }

    const loadEval = async () => {
      setEvalLoading(true);
      try {
        const evalRes = await mlApi.getModelEvaluation(selectedModelForEval.id);
        setEvaluationData(evalRes);
      } catch {
        setEvaluationData(null);
      } finally {
        setEvalLoading(false);
      }
    };

    loadEval();
  }, [selectedModelForEval]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSelectModelForEval = (model: MLModel) => {
    setSelectedModelForEval(model);
    setActiveTab('evaluation');
  };

  const handleOpenInference = (model: MLModel) => {
    setInferenceModel(model);
  };

  const handleStartTrainingJob = async (payload: {
    dataset_id: number;
    model_type: MLModelType;
    n_estimators: number;
    max_depth?: number;
    contamination?: number;
    class_weight?: string;
    random_state: number;
  }) => {
    setIsStartingTraining(true);
    try {
      const job = await mlApi.createTrainingJob(payload);
      setNotification({
        type: 'success',
        message: `Training job #${job.id} for ${job.model_type} launched successfully.`,
      });
      setIsTrainModalOpen(false);
      setActiveTab('jobs');
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to start training job',
      });
    } finally {
      setIsStartingTraining(false);
    }
  };

  const handleGenerateBenchmark = async () => {
    setIsGeneratingBenchmark(true);
    try {
      const ds = await mlApi.registerDataset({
        name: 'SENTRA Canonical Flow Benchmark',
        source: 'SENTRA Synthetic Traffic Generator',
        file_path: 'backend/storage/datasets/sentra_benchmark_1200.parquet',
        generate_benchmark: true,
        description: 'Multi-class synthetic flow dataset for SIH 2026 Problem Statement 26145 benchmark training',
      });
      setNotification({
        type: 'success',
        message: `Benchmark dataset #${ds.id} generated and registered successfully.`,
      });
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to generate benchmark dataset',
      });
    } finally {
      setIsGeneratingBenchmark(false);
    }
  };

  const activeJobCount = jobs.filter((j) => j.status === 'queued' || j.status === 'training').length;
  const trainedModelCount = models.filter((m) => m.status === 'evaluated' || m.status === 'trained').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                AI / ML Threat Detection Engine
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Phase 5
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Supervised Multi-Class Threat Classification & Unsupervised Anomaly Detection for Unidirectional IP Flows
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsTrainModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all"
          >
            <Play className="w-4 h-4" />
            Train New Model
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Registered Models
            </span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{models.length}</span>
            <span className="text-xs text-emerald-400">({trainedModelCount} evaluated)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Random Forest & Isolation Forest</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Training Jobs
            </span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{activeJobCount}</span>
            <span className="text-xs text-slate-400">/ {jobs.length} total run</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Non-blocking background workers</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Available Datasets
            </span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{datasets.length}</span>
            <span className="text-xs text-slate-400">registered</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">SENTRA v1.0.0 schema verified</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Target Threat Classes
            </span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">5</span>
            <span className="text-xs text-cyan-400">classes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Normal, DDoS, Recon, DNS Tun, Exfil</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'models'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Model Registry ({models.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'jobs'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Training History ({jobs.length})
            {activeJobCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500 text-white font-mono animate-pulse">
                {activeJobCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('datasets')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'datasets'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Datasets ({datasets.length})
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'evaluation'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Model Evaluation
            {selectedModelForEval && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {selectedModelForEval.version}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'models' && (
        <ModelRegistryTable
          models={models}
          loading={loading}
          onViewEvaluation={handleSelectModelForEval}
          onOpenInference={handleOpenInference}
        />
      )}

      {activeTab === 'jobs' && (
        <TrainingJobsTable
          jobs={jobs}
          loading={loading}
          onSelectModel={(modelId: number) => {
            const m = models.find((x) => x.id === modelId);
            if (m) {
              handleSelectModelForEval(m);
            }
          }}
        />
      )}

      {activeTab === 'datasets' && (
        <DatasetRegistryTable
          datasets={datasets}
          loading={loading}
          onGenerateBenchmark={handleGenerateBenchmark}
          generatingBenchmark={isGeneratingBenchmark}
        />
      )}

      {activeTab === 'evaluation' && (
        <div className="space-y-4">
          {/* Model Switcher Dropdown */}
          {models.length > 1 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Inspect Model Evaluation Report:
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedModelForEval?.id || ''}
                  onChange={(e) => {
                    const found = models.find((m) => m.id === parseInt(e.target.value));
                    if (found) setSelectedModelForEval(found);
                  }}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.version}] {m.name} ({m.model_type})
                    </option>
                  ))}
                </select>
                {selectedModelForEval && (
                  <button
                    onClick={() => handleOpenInference(selectedModelForEval)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Test Inference
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedModelForEval ? (
            <ModelEvaluationView
              model={selectedModelForEval}
              evaluation={evaluationData}
              loading={evalLoading}
              onClose={() => setActiveTab('models')}
            />
          ) : (
            <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
              No model selected or available for evaluation. Train a model first.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <StartTrainingModal
        isOpen={isTrainModalOpen}
        onClose={() => setIsTrainModalOpen(false)}
        datasets={datasets}
        onSubmit={handleStartTrainingJob}
        loading={isStartingTraining}
      />

      <InferencePlaygroundModal
        isOpen={!!inferenceModel}
        onClose={() => setInferenceModel(null)}
        model={inferenceModel}
      />
    </div>
  );
};
