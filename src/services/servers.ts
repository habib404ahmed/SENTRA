import { MonitoredServer, ServerEnvironment, TrafficSourceType } from '@/types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface BackendServer {
  id: number;
  name: string;
  hostname: string;
  ip_address: string;
  server_type: string;
  environment: string;
  traffic_source: string;
  status: 'active' | 'paused';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateServerPayload {
  name: string;
  hostname: string;
  ipAddress?: string;
  ip_address?: string;
  serverType?: string;
  server_type?: string;
  environment: ServerEnvironment | string;
  trafficSource?: TrafficSourceType | string;
  traffic_source?: string;
  monitoringStatus?: 'active' | 'paused' | 'degraded';
  status?: 'active' | 'paused';
  description?: string;
}

export interface UpdateServerPayload {
  name?: string;
  hostname?: string;
  ip_address?: string;
  server_type?: string;
  environment?: string;
  traffic_source?: string;
  status?: 'active' | 'paused';
  description?: string;
}

/**
 * Transforms backend database server representation into frontend MonitoredServer
 */
export function mapBackendToMonitoredServer(server: BackendServer): MonitoredServer {
  return {
    id: String(server.id),
    name: server.name,
    hostname: server.hostname,
    ipAddress: server.ip_address,
    serverType: server.server_type,
    environment: server.environment as ServerEnvironment,
    trafficSource: server.traffic_source as TrafficSourceType,
    monitoringStatus: (server.status === 'paused' ? 'paused' : 'active'),
    description: server.description || 'Passive flow telemetry ingestion target.',
    lastActivity: 'Live Telemetry Tap',
    activeThreats: 0,
    stats: {
      packetsProcessed: '1.42 M',
      bytesProcessed: '912 MB',
      flowCount: '3.8k',
      connectionRate: '145/s',
      pps: 480,
      bandwidthMbps: 54.2,
    },
  };
}

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

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
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

export const serversApi = {
  /**
   * Health checks
   */
  async checkHealth(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse<{ status: string }>(res);
  },

  async checkDbHealth(): Promise<{ status: string; database?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/health/db`);
    return handleResponse<{ status: string; database?: string }>(res);
  },

  /**
   * GET /api/servers
   */
  async getAll(): Promise<MonitoredServer[]> {
    const res = await fetch(`${API_BASE_URL}/api/servers`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await handleResponse<BackendServer[]>(res);
    return data.map(mapBackendToMonitoredServer);
  },

  /**
   * GET /api/servers/{id}
   */
  async getById(id: string | number): Promise<MonitoredServer> {
    const res = await fetch(`${API_BASE_URL}/api/servers/${id}`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await handleResponse<BackendServer>(res);
    return mapBackendToMonitoredServer(data);
  },

  /**
   * POST /api/servers
   */
  async create(data: CreateServerPayload): Promise<MonitoredServer> {
    const payload = {
      name: data.name,
      hostname: data.hostname,
      ip_address: data.ip_address || data.ipAddress || '',
      server_type: data.server_type || data.serverType || 'Web Server',
      environment: data.environment,
      traffic_source: data.traffic_source || data.trafficSource || 'Optical Diode Tap',
      status: data.status || (data.monitoringStatus === 'paused' ? 'paused' : 'active'),
      description: data.description || '',
    };

    const res = await fetch(`${API_BASE_URL}/api/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const created = await handleResponse<BackendServer>(res);
    return mapBackendToMonitoredServer(created);
  },

  /**
   * PUT /api/servers/{id}
   */
  async update(id: string | number, data: UpdateServerPayload): Promise<MonitoredServer> {
    const res = await fetch(`${API_BASE_URL}/api/servers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const updated = await handleResponse<BackendServer>(res);
    return mapBackendToMonitoredServer(updated);
  },

  /**
   * DELETE /api/servers/{id}
   */
  async delete(id: string | number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/servers/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<void>(res);
  },
};
