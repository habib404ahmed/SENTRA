import {
  FeatureJob,
  FeatureJobList,
  FeatureSchemaMetadata,
  FlowFeatureList,
  FeatureDatasetList,
  FeatureDataset
} from '@/types';
import { API_BASE_URL, ApiError } from './servers';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorJson = await response.json();
      if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (errorJson.message) {
        errorDetail = errorJson.message;
      }
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new ApiError(errorDetail, response.status);
  }
  return response.json();
}

export const featuresApi = {
  async startFeatureExtraction(importId: number, windowSeconds: number = 300.0): Promise<FeatureJob> {
    const res = await fetch(`${API_BASE_URL}/api/features/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        import_id: importId,
        window_seconds: windowSeconds
      })
    });
    return handleResponse<FeatureJob>(res);
  },

  async getFeatureJobs(importId?: number, status?: string): Promise<FeatureJobList> {
    const query = new URLSearchParams();
    if (importId !== undefined) query.append('import_id', String(importId));
    if (status) query.append('status', status);

    const url = `${API_BASE_URL}/api/features/jobs${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<FeatureJobList>(res);
  },

  async getFeatureJob(jobId: number): Promise<FeatureJob> {
    const res = await fetch(`${API_BASE_URL}/api/features/jobs/${jobId}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<FeatureJob>(res);
  },

  async getFeatureSchema(): Promise<FeatureSchemaMetadata> {
    const res = await fetch(`${API_BASE_URL}/api/features/schema`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<FeatureSchemaMetadata>(res);
  },

  async getFlowFeatures(params?: {
    jobId?: number;
    flowId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<FlowFeatureList> {
    const query = new URLSearchParams();
    if (params?.jobId !== undefined) query.append('job_id', String(params.jobId));
    if (params?.flowId !== undefined) query.append('flow_id', String(params.flowId));
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('page_size', String(params.pageSize));

    const url = `${API_BASE_URL}/api/features${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<FlowFeatureList>(res);
  },

  async getDatasets(params?: {
    jobId?: number;
    format?: string;
    datasetType?: string;
  }): Promise<FeatureDatasetList> {
    const query = new URLSearchParams();
    if (params?.jobId !== undefined) query.append('job_id', String(params.jobId));
    if (params?.format) query.append('format', params.format);
    if (params?.datasetType) query.append('dataset_type', params.datasetType);

    const url = `${API_BASE_URL}/api/datasets${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<FeatureDatasetList>(res);
  },

  async downloadDatasetFile(datasetId: number, filename: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/download`);
    if (!res.ok) {
      throw new ApiError(`Download failed with status ${res.status}`, res.status);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
