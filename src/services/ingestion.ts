import { PcapImport, PcapImportList, TrafficFlowList } from '@/types';
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

export const ingestionApi = {
  /**
   * Upload an authorized PCAP/PCAPNG file for directional flow processing.
   */
  async uploadPcap(file: File, serverId?: string | number): Promise<PcapImport> {
    const formData = new FormData();
    formData.append('file', file);
    if (serverId !== undefined && serverId !== null && serverId !== '') {
      formData.append('server_id', String(serverId));
    }

    const res = await fetch(`${API_BASE_URL}/api/ingestion/pcap`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<PcapImport>(res);
  },

  /**
   * List PCAP capture imports with optional filtering and pagination.
   */
  async getImports(params?: {
    server_id?: number | string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<PcapImportList> {
    const query = new URLSearchParams();
    if (params?.server_id !== undefined && params?.server_id !== '') {
      query.append('server_id', String(params.server_id));
    }
    if (params?.status) {
      query.append('status', params.status);
    }
    if (params?.skip !== undefined) {
      query.append('skip', String(params.skip));
    }
    if (params?.limit !== undefined) {
      query.append('limit', String(params.limit));
    }

    const url = `${API_BASE_URL}/api/ingestion${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    return handleResponse<PcapImportList>(res);
  },

  /**
   * Get details and status of a single PCAP import.
   */
  async getImportById(id: number | string): Promise<PcapImport> {
    const res = await fetch(`${API_BASE_URL}/api/ingestion/${id}`, {
      headers: { 'Accept': 'application/json' },
    });
    return handleResponse<PcapImport>(res);
  },

  /**
   * Get directional flows extracted from a specific PCAP import.
   */
  async getImportFlows(
    id: number | string,
    params?: {
      protocol?: string;
      source_ip?: string;
      destination_ip?: string;
      skip?: number;
      limit?: number;
    }
  ): Promise<TrafficFlowList> {
    const query = new URLSearchParams();
    if (params?.protocol && params.protocol !== 'all') {
      query.append('protocol', params.protocol);
    }
    if (params?.source_ip) {
      query.append('source_ip', params.source_ip);
    }
    if (params?.destination_ip) {
      query.append('destination_ip', params.destination_ip);
    }
    if (params?.skip !== undefined) {
      query.append('skip', String(params.skip));
    }
    if (params?.limit !== undefined) {
      query.append('limit', String(params.limit));
    }

    const url = `${API_BASE_URL}/api/ingestion/${id}/flows${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    return handleResponse<TrafficFlowList>(res);
  },
};
