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
} from 'lucide-react';
import {
  FeatureJob,
  FeatureSchemaMetadata,
  FeatureDataset,
  PcapImport
} from '../types';
import { featuresApi } from '../services/features';
import { ingestionApi } from '../services/ingestion';
import { Button } from '@/components/common/Button';

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

  const activeJobCount = jobs.filter((j) => j.status === 'processing' || j.status === 'queued').length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-display flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-sentra-cyan" />
            Feature Engineering & Dataset Preparation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mathematical flow cleaning, retrospective behavioral window aggregation, and leak-free dataset generation.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRefreshing(true); fetchData(); }}
            disabled={refreshing || loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsStartModalOpen(true)}
            icon={<Play className="w-3.5 h-3.5 fill-current" />}
          >
            Start Extraction
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded border flex items-center justify-between text-xs ${
            notification.type === 'success'
              ? 'bg-sentra-green/10 border-sentra-green/30 text-sentra-green'
              : 'bg-sentra-danger/10 border-sentra-danger/30 text-sentra-danger'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs uppercase tracking-wider hover:underline opacity-80 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="soc-card p-4">
          <span className="text-xs text-slate-400">Total Pipeline Jobs</span>
          <p className="text-2xl font-bold text-slate-100 mt-1.5">{jobs.length}</p>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Audit tracked</span>
        </div>

        <div className="soc-card p-4">
          <span className="text-xs text-slate-400">Feature Dimensions</span>
          <p className="text-2xl font-bold text-sentra-cyan mt-1.5">{schema?.total_features || 29}</p>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Schema {schema?.version || 'v1.0.0'}
          </span>
        </div>

        <div className="soc-card p-4">
          <span className="text-xs text-slate-400">Generated Datasets</span>
          <p className="text-2xl font-bold text-sentra-purple mt-1.5">{datasets.length}</p>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">CSV & Parquet</span>
        </div>

        <div className="soc-card p-4">
          <span className="text-xs text-slate-400">Pipeline State</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`w-2 h-2 rounded-full ${activeJobCount > 0 ? 'bg-sentra-amber animate-pulse' : 'bg-sentra-green'}`} />
            <span className={`text-sm font-semibold ${activeJobCount > 0 ? 'text-sentra-amber' : 'text-sentra-green'}`}>
              {activeJobCount > 0 ? `${activeJobCount} Active` : 'Ready'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">No label leakage</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto custom-scrollbar whitespace-nowrap -mx-1 px-1">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 px-1 mr-4 text-xs font-semibold flex items-center gap-2 transition-all relative shrink-0 touch-manipulation ${
            activeTab === 'jobs'
              ? 'text-sentra-cyan border-b-2 border-sentra-cyan'
              : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Extraction Jobs
          {activeJobCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-sentra-amber/20 text-sentra-amber border border-sentra-amber/40 font-bold animate-pulse">
              {activeJobCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('datasets')}
          className={`pb-3 px-1 mr-4 text-xs font-semibold flex items-center gap-2 transition-all relative shrink-0 touch-manipulation ${
            activeTab === 'datasets'
              ? 'text-sentra-cyan border-b-2 border-sentra-cyan'
              : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Generated Datasets
          <span className="px-1.5 py-0.5 bg-background-card text-slate-400 rounded text-[10px] border border-border">
            {datasets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`pb-3 px-1 mr-4 text-xs font-semibold flex items-center gap-2 transition-all relative shrink-0 touch-manipulation ${
            activeTab === 'schema'
              ? 'text-sentra-cyan border-b-2 border-sentra-cyan'
              : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Feature Schema
          <span className="px-1.5 py-0.5 bg-sentra-cyan/10 text-sentra-cyan rounded text-[10px] border border-sentra-cyan/30">
            {schema?.version || 'v1.0.0'}
          </span>
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
