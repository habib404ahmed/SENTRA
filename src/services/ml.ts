import {
  MLDataset,
  MLDatasetList,
  MLTrainingJob,
  MLTrainingJobList,
  MLModel,
  MLModelList,
  MLEvaluation,
  MLPredictResponse
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

export const mlApi = {
  // Datasets
  async registerDataset(payload: {
    name: string;
    source: string;
    file_path?: string;
    generate_benchmark?: boolean;
    description?: string;
  }): Promise<MLDataset> {
    const res = await fetch(`${API_BASE_URL}/api/ml/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleResponse<MLDataset>(res);
  },

  async getDatasets(): Promise<MLDatasetList> {
    const res = await fetch(`${API_BASE_URL}/api/ml/datasets`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<MLDatasetList>(res);
  },

  async getDataset(id: number): Promise<MLDataset> {
    const res = await fetch(`${API_BASE_URL}/api/ml/datasets/${id}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<MLDataset>(res);
  },

  // Training Jobs
  async createTrainingJob(payload: {
    dataset_id: number;
    model_type: 'classifier' | 'anomaly_detector';
    algorithm?: string;
    n_estimators?: number;
    max_depth?: number;
    contamination?: number;
    class_weight?: string;
    random_state?: number;
  }): Promise<MLTrainingJob> {
    const res = await fetch(`${API_BASE_URL}/api/ml/training-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleResponse<MLTrainingJob>(res);
  },

  async getTrainingJobs(): Promise<MLTrainingJobList> {
    const res = await fetch(`${API_BASE_URL}/api/ml/training-jobs`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<MLTrainingJobList>(res);
  },

  async getTrainingJob(id: number): Promise<MLTrainingJob> {
    const res = await fetch(`${API_BASE_URL}/api/ml/training-jobs/${id}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<MLTrainingJob>(res);
  },

  // Model Registry
  async getModels(modelType?: string): Promise<MLModelList> {
    const query = modelType ? `?model_type=${encodeURIComponent(modelType)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/ml/models${query}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<MLModelList>(res);
  },

  async getModel(id: number): Promise<MLModel> {
    const res = await fetch(`${API_BASE_URL}/api/ml/models/${id}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<MLModel>(res);
  },

  async getModelEvaluation(modelId: number): Promise<MLEvaluation> {
    const res = await fetch(`${API_BASE_URL}/api/ml/models/${modelId}/evaluation`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<MLEvaluation>(res);
  },

  async getFeatureImportance(modelId: number): Promise<{ model_id: number; feature_importances: any[] }> {
    const res = await fetch(`${API_BASE_URL}/api/ml/feature-importance/${modelId}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<{ model_id: number; feature_importances: any[] }>(res);
  },

  // Inference / Prediction
  async predictFlow(modelId: number, features: Record<string, any>): Promise<MLPredictResponse> {
    const res = await fetch(`${API_BASE_URL}/api/ml/predict/${modelId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ features })
    });
    return handleResponse<MLPredictResponse>(res);
  },

  // Subsystem Health
  async getHealth(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE_URL}/api/ml/health`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<Record<string, any>>(res);
  }
};
