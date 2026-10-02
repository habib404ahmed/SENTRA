import React, { useState, useEffect } from 'react';
import {
  Layers,
  Database,
  FileSpreadsheet,
  Play,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import {
  FeatureJob,
  FeatureSchemaMetadata,
  FeatureDataset,
  PcapImport
} from '../types';
import { featuresApi } from '../services/features';
import { ingestionApi } from '../services/ingestion';

import { JobHistoryTable } from '../components/features/JobHistoryTable';
import { DatasetsTable } from '../components/features/DatasetsTable';
import { FeatureSchemaExplorer } from '../components/features/FeatureSchemaExplorer';
import { JobDetailModal } from '../components/features/JobDetailModal';
import { StartExtractionModal } from '../components/features/StartExtractionModal';

export const FeaturesPage: React.FC = () => {
  const [jobs, setJobs] = useState<FeatureJob[]>([]);
  const [datasets, setDatasets] = useState<FeatureDataset[]>([]);
  const [schema, setSchema] = useState<FeatureSchemaMetadata | null>(null);
  const [imports, setImports] = useState<PcapImport[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'jobs' | 'datasets' | 'schema'>('jobs');

  const [selectedJobForModal, setSelectedJobForModal] = useState<FeatureJob | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      const [jobsRes, datasetsRes, schemaRes, importsRes] = await Promise.all([
        featuresApi.getFeatureJobs(),
        featuresApi.getDatasets(),
        featuresApi.getFeatureSchema(),
        ingestionApi.getImports({ limit: 100 })
      ]);
      setJobs(jobsRes.items);
      setDatasets(datasetsRes.items);
      setSchema(schemaRes);
      setImports(importsRes.items);
    } catch (err: any) {
      console.error('Failed to load feature engineering data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-poll active jobs every 3 seconds
  useEffect(() => {
    const hasActiveJob = jobs.some((j) => j.status === 'processing' || j.status === 'queued');
    if (!hasActiveJob) return;

    const interval = setInterval(async () => {
      try {
        const [jobsRes, datasetsRes] = await Promise.all([
          featuresApi.getFeatureJobs(),
          featuresApi.getDatasets()
        ]);
        setJobs(jobsRes.items);
        setDatasets(datasetsRes.items);
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  const handleStartExtraction = async (importId: number, windowSeconds: number) => {
    setStartLoading(true);
    try {
      const newJob = await featuresApi.startFeatureExtraction(importId, windowSeconds);
      setNotification({
        type: 'success',
        message: `Feature extraction job #${newJob.id} queued successfully for Import #${importId}.`
      });
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Failed to dispatch feature extraction job.'
      });
      throw err;
    } finally {
      setStartLoading(false);
    }
  };

  const handleDownloadDataset = async (dataset: FeatureDataset) => {
    try {
      await featuresApi.downloadDatasetFile(dataset.id, dataset.name);
      setNotification({
        type: 'success',
        message: `Downloaded dataset: ${dataset.name}`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Download failed: ${err.message}`
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">
                Feature Engineering & Dataset Preparation
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Mathematical flow cleaning, retrospective behavioral window aggregation, and leak-free dataset generation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all"
            title="Refresh pipeline status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsStartModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Feature Extraction</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Total Pipeline Jobs</span>
          <p className="text-xl font-bold text-white mt-1">{jobs.length}</p>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Audit tracked</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Feature Dimensions</span>
          <p className="text-xl font-bold text-indigo-400 mt-1">{schema?.total_features || 29}</p>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Schema {schema?.version || 'v1.0.0'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Generated Datasets</span>
          <p className="text-xl font-bold text-purple-400 mt-1">{datasets.length}</p>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">CSV & Parquet</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Pipeline State</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-400">Ready for Extraction</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">No label leakage</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 text-xs font-semibold flex items-center space-x-2 transition-all relative ${
            activeTab === 'jobs' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Extraction Jobs</span>
          {activeTab === 'jobs' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('datasets')}
          className={`pb-3 text-xs font-semibold flex items-center space-x-2 transition-all relative ${
            activeTab === 'datasets' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Generated Datasets</span>
          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[10px]">
            {datasets.length}
          </span>
          {activeTab === 'datasets' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`pb-3 text-xs font-semibold flex items-center space-x-2 transition-all relative ${
            activeTab === 'schema' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Feature Schema</span>
          <span className="px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 rounded text-[10px]">
            {schema?.version || 'v1.0.0'}
          </span>
          {activeTab === 'schema' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'jobs' && (
        <JobHistoryTable
          jobs={jobs}
          loading={loading}
          onViewJob={(job) => setSelectedJobForModal(job)}
        />
      )}

      {activeTab === 'datasets' && (
        <DatasetsTable
          datasets={datasets}
          loading={loading}
          onDownload={handleDownloadDataset}
        />
      )}

      {activeTab === 'schema' && (
        <FeatureSchemaExplorer schema={schema} loading={loading} />
      )}

      {/* Modals */}
      <JobDetailModal
        job={selectedJobForModal}
        onClose={() => setSelectedJobForModal(null)}
      />

      <StartExtractionModal
        imports={imports}
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onSubmit={handleStartExtraction}
        loading={startLoading}
      />
    </div>
  );
};
