import { TrafficFlow, TrafficFlowList } from '@/types';
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

export const flowsApi = {
  /**
   * Search and filter directional traffic flows with pagination.
   */
  async getFlows(params?: {
    import_id?: number | string;
    server_id?: number | string;
    source_ip?: string;
    destination_ip?: string;
    source_port?: number | string;
    destination_port?: number | string;
    protocol?: string;
    skip?: number;
    limit?: number;
  }): Promise<TrafficFlowList> {
    const query = new URLSearchParams();
    if (params?.import_id !== undefined && params?.import_id !== '') {
      query.append('import_id', String(params.import_id));
    }
    if (params?.server_id !== undefined && params?.server_id !== '') {
      query.append('server_id', String(params.server_id));
    }
    if (params?.source_ip) {
      query.append('source_ip', params.source_ip.trim());
    }
    if (params?.destination_ip) {
      query.append('destination_ip', params.destination_ip.trim());
    }
    if (params?.source_port !== undefined && params?.source_port !== '') {
      query.append('source_port', String(params.source_port));
    }
    if (params?.destination_port !== undefined && params?.destination_port !== '') {
      query.append('destination_port', String(params.destination_port));
    }
    if (params?.protocol && params.protocol !== 'all') {
      query.append('protocol', params.protocol.trim());
    }
    if (params?.skip !== undefined) {
      query.append('skip', String(params.skip));
    }
    if (params?.limit !== undefined) {
      query.append('limit', String(params.limit));
    }

    const url = `${API_BASE_URL}/api/flows${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    return handleResponse<TrafficFlowList>(res);
  },

  /**
   * Get single directional flow metadata and TCP flags.
   */
  async getFlowById(id: number | string): Promise<TrafficFlow> {
    const res = await fetch(`${API_BASE_URL}/api/flows/${id}`, {
      headers: { 'Accept': 'application/json' },
    });
    return handleResponse<TrafficFlow>(res);
  },
};
