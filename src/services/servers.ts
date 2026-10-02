import { MonitoredServer, ServerEnvironment, TrafficSourceType } from '@/types';
import { API_BASE_URL, IS_LOCAL_API, isLocalhostApi, buildApiUrl } from '@/config/api';

export { API_BASE_URL, IS_LOCAL_API, isLocalhostApi, buildApiUrl };

export type ApiErrorKind = 
  | 'backend_offline' 
  | 'database_offline' 
  | 'auth_error' 
  | 'endpoint_missing' 
  | 'invalid_response' 
  | 'server_error' 
  | 'validation_error' 
  | 'unknown';

export interface ConnectionDiagnosticResult {
  backendOnline: boolean;
  databaseOnline: boolean;
  backendLatencyMs?: number;
  databaseLatencyMs?: number;
  errorKind?: ApiErrorKind;
  statusMessage: string;
  technicalDetails?: string;
  timestamp: string;
}

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
  kind: ApiErrorKind;
  details?: any;

  constructor(message: string, status: number, kind: ApiErrorKind = 'unknown', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.details = details;
  }
}

/**
 * Core fetch wrapper with resilient network error classification
 */
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (err: any) {
    const targetDesc = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'configured API origin');
    const isLocal = isLocalhostApi(API_BASE_URL);
    const guidance = isLocal
      ? "Ensure local FastAPI backend is active ('sentra-service.ps1 start' or 'uvicorn app.main:app --port 8000')."
      : `Verify the hosted SENTRA API service at ${targetDesc} is running and allows CORS requests from this domain.`;

    throw new ApiError(
      `FastAPI backend service is offline or unreachable at ${targetDesc}. ${guidance}`,
      0,
      'backend_offline',
      err?.message
    );
  }

  if (!response.ok) {
    let errorDetail = 'API request failed';
    let rawJson: any = null;

    try {
      rawJson = await response.json();
      if (typeof rawJson.detail === 'string') {
        errorDetail = rawJson.detail;
      } else if (Array.isArray(rawJson.detail)) {
        errorDetail = rawJson.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (rawJson.message) {
        errorDetail = rawJson.message;
      }
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }

    let kind: ApiErrorKind = 'unknown';
    if (response.status === 401 || response.status === 403) {
      kind = 'auth_error';
    } else if (response.status === 404) {
      kind = 'endpoint_missing';
      if (errorDetail === 'Not Found' || errorDetail === '404 Not Found') {
        errorDetail = `Server API endpoint not found (HTTP 404) at ${url}. Check API route configuration.`;
      }
    } else if (response.status === 422) {
      kind = 'validation_error';
    } else if (response.status === 503) {
      kind = 'database_offline';
    } else if (response.status >= 500) {
      if (errorDetail.toLowerCase().includes('database') || errorDetail.toLowerCase().includes('postgresql')) {
        kind = 'database_offline';
      } else {
        kind = 'server_error';
      }
    }

    throw new ApiError(errorDetail, response.status, kind, rawJson);
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    return await response.json();
  } catch (jsonErr: any) {
    throw new ApiError('Received invalid JSON payload from server', response.status, 'invalid_response', jsonErr?.message);
  }
}

/**
 * Diagnostics utility: independently verifies FastAPI liveness and PostgreSQL database connectivity
 */
export async function checkSystemDiagnostics(): Promise<ConnectionDiagnosticResult> {
  const result: ConnectionDiagnosticResult = {
    backendOnline: false,
    databaseOnline: false,
    statusMessage: '',
    timestamp: new Date().toISOString(),
  };

  // Step 1: Check FastAPI Backend Liveness (with 3-second abort timeout)
  const t0 = performance.now();
  const c1 = new AbortController();
  const t1Id = setTimeout(() => c1.abort(), 3000);
  const healthUrl = buildApiUrl('/api/health');
  try {
    let healthRes = await fetch(healthUrl, {
      headers: { 'Accept': 'application/json' },
      signal: c1.signal,
    });

    // Fallback: if /api/health returns 404, try /health alias
    if (healthRes.status === 404) {
      try {
        const altUrl = API_BASE_URL ? `${API_BASE_URL}/health` : '/health';
        const altRes = await fetch(altUrl, {
          headers: { 'Accept': 'application/json' },
          signal: c1.signal,
        });
        if (altRes.ok) {
          healthRes = altRes;
        }
      } catch {}
    }

    result.backendLatencyMs = Math.round(performance.now() - t0);

    if (!healthRes.ok) {
      result.backendOnline = false;
      result.errorKind = healthRes.status === 404 ? 'endpoint_missing' : 'server_error';
      result.statusMessage = healthRes.status === 404
        ? `Backend API server is reachable, but health route returned HTTP 404 Not Found at ${healthUrl}.`
        : `Backend responded with HTTP ${healthRes.status}. Health endpoint returned an error.`;
      result.technicalDetails = `Status: ${healthRes.status} ${healthRes.statusText}`;
      return result;
    }

    result.backendOnline = true;
  } catch (err: any) {
    const targetDesc = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'configured origin');
    const isLocal = isLocalhostApi(API_BASE_URL);
    result.backendOnline = false;
    result.errorKind = 'backend_offline';
    result.statusMessage = `Backend API server is offline or unreachable at ${targetDesc}.`;
    result.technicalDetails = isLocal
      ? `Local network fetch failed (${err?.name === 'AbortError' ? 'Connection timed out' : err?.message || 'Connection refused'}). Start backend using '.\\sentra-service.ps1 start' or automatic Windows startup.`
      : `Remote network fetch to ${targetDesc} failed (${err?.name === 'AbortError' ? 'Connection timed out' : err?.message || 'Network error'}). Check cloud deployment status, container logs, and CORS origin configuration.`;
    return result;
  } finally {
    clearTimeout(t1Id);
  }

  // Step 2: Check PostgreSQL Database Health through FastAPI
  const t1 = performance.now();
  const c2 = new AbortController();
  const t2Id = setTimeout(() => c2.abort(), 3500);
  const dbHealthUrl = buildApiUrl('/api/health/db');
  try {
    let dbRes = await fetch(dbHealthUrl, {
      headers: { 'Accept': 'application/json' },
      signal: c2.signal,
    });

    // Fallback: if /api/health/db returns 404, try /health/db alias
    if (dbRes.status === 404) {
      try {
        const altDbUrl = API_BASE_URL ? `${API_BASE_URL}/health/db` : '/health/db';
        const altDbRes = await fetch(altDbUrl, {
          headers: { 'Accept': 'application/json' },
          signal: c2.signal,
        });
        if (altDbRes.ok || altDbRes.status === 503) {
          dbRes = altDbRes;
        }
      } catch {}
    }

    result.databaseLatencyMs = Math.round(performance.now() - t1);

    if (dbRes.ok) {
      const dbData = await dbRes.json();
      if (dbData.status === 'ok' && dbData.database === 'connected') {
        result.databaseOnline = true;
        result.statusMessage = 'FastAPI backend and PostgreSQL database are healthy and connected.';
        return result;
      }
    }

    result.databaseOnline = false;
    result.errorKind = 'database_offline';
    let detail = 'Database connection failed';
    try {
      const dbErr = await dbRes.json();
      detail = dbErr.detail || dbErr.message || detail;
    } catch {}
    result.statusMessage = 'FastAPI backend is active, but PostgreSQL database is disconnected.';
    result.technicalDetails = detail;
    return result;
  } catch (dbErr: any) {
    result.databaseOnline = false;
    result.errorKind = 'database_offline';
    result.statusMessage = 'FastAPI backend is active, but checking PostgreSQL connectivity failed.';
    result.technicalDetails = dbErr?.message;
    return result;
  } finally {
    clearTimeout(t2Id);
  }
}

export const serversApi = {
  /**
   * Health checks
   */
  async checkHealth(): Promise<{ status: string }> {
    return apiFetch<{ status: string }>('/api/health');
  },

  async checkDbHealth(): Promise<{ status: string; database?: string }> {
    return apiFetch<{ status: string; database?: string }>('/api/health/db');
  },

  async checkDiagnostics(): Promise<ConnectionDiagnosticResult> {
    return checkSystemDiagnostics();
  },

  /**
   * GET /api/servers
   */
  async getAll(): Promise<MonitoredServer[]> {
    const data = await apiFetch<BackendServer[]>('/api/servers');
    return data.map(mapBackendToMonitoredServer);
  },

  /**
   * GET /api/servers/{id}
   */
  async getById(id: string | number): Promise<MonitoredServer> {
    const data = await apiFetch<BackendServer>(`/api/servers/${id}`);
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

    const created = await apiFetch<BackendServer>('/api/servers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return mapBackendToMonitoredServer(created);
  },

  /**
   * PUT /api/servers/{id}
   */
  async update(id: string | number, data: UpdateServerPayload): Promise<MonitoredServer> {
    const updated = await apiFetch<BackendServer>(`/api/servers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return mapBackendToMonitoredServer(updated);
  },

  /**
   * DELETE /api/servers/{id}
   */
  async delete(id: string | number): Promise<void> {
    await apiFetch<void>(`/api/servers/${id}`, {
      method: 'DELETE',
    });
  },
};
