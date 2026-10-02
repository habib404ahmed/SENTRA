import {
  ThreatAlert,
  AlertStatus,
  Severity,
  DetectionJob,
  DetectionHealth
} from '@/types';
import { API_BASE_URL, ApiError } from './servers';

export interface BackendAlert {
  id: number;
  threat: string;
  threat_class: string;
  detection_type: string;
  detection_decision: string;
  severity: string;
  source_ip: string;
  destination_ip: string;
  source_port?: number | null;
  destination_port?: number | null;
  protocol: string;
  model_score?: number | null;
  anomaly_score?: number | null;
  status: string;
  details?: string | null;
  server_id?: number | null;
  flow_id?: number | null;
  import_id?: number | null;
  model_id?: number | null;
  model_version?: string | null;
  feature_schema_version: string;
  detection_policy_version: string;
  dedup_key?: string | null;
  occurrence_count: number;
  evidence: Record<string, any>;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  history?: {
    id: number;
    alert_id: number;
    previous_status: string;
    new_status: string;
    changed_by: string;
    note?: string | null;
    created_at: string;
  }[];
}

export interface AlertListResponse {
  total: number;
  page: number;
  page_size: number;
  items: BackendAlert[];
}

export interface AlertSummary {
  total_alerts: number;
  active_alerts: number;
  critical_alerts: number;
  resolved_alerts: number;
  by_severity: Record<string, number>;
  by_threat_class: Record<string, number>;
  by_status: Record<string, number>;
  top_source_ips: { ip: string; count: number; max_severity: string }[];
  top_targeted_servers: { server_id: number; server_name: string; count: number }[];
  recent_trend: { date: string; count: number }[];
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
  return response.json();
}

export function mapBackendAlertToThreatAlert(a: BackendAlert, serverName: string = ''): ThreatAlert {
  const rawScore = a.model_score != null ? Math.round(a.model_score * 100) : 85;

  // Flatten evidence indicators
  const evidenceList: string[] = [];
  if (a.evidence) {
    if (a.evidence.decision_summary) {
      evidenceList.push(a.evidence.decision_summary);
    }
    if (Array.isArray(a.evidence.behavioral_indicators)) {
      evidenceList.push(...a.evidence.behavioral_indicators);
    }
    const facts = a.evidence.observed_network_facts;
    if (facts) {
      if (facts.packets_per_second > 100) {
        evidenceList.push(`Forward packet velocity: ${facts.packets_per_second} pps (${facts.bytes_per_second} Bps)`);
      }
      if (facts.tcp_flags && facts.tcp_flags.syn_ratio > 0.5) {
        evidenceList.push(`Elevated TCP SYN ratio: ${(facts.tcp_flags.syn_ratio * 100).toFixed(1)}%`);
      }
    }
  }
  if (evidenceList.length === 0) {
    evidenceList.push(a.details || `AI-detected ${a.threat_class} threat pattern.`);
  }

  // Construct timeline from history or timestamps
  const timeline = (a.history && a.history.length > 0)
    ? a.history.map(h => ({
        time: h.created_at,
        event: `Status: ${h.new_status}`,
        details: h.note || `Transitioned by ${h.changed_by}`
      }))
    : [
        {
          time: a.created_at,
          event: 'Alert Generated',
          details: `Threat signature flagged by ${a.detection_type} policy (${a.detection_decision})`
        }
      ];

  return {
    id: String(a.id),
    threat: a.threat_class || a.threat,
    threat_class: a.threat_class,
    detection_type: a.detection_type,
    detection_decision: a.detection_decision,
    severity: (a.severity.toLowerCase() as Severity) || 'medium',
    sourceIp: a.source_ip,
    destinationIp: a.destination_ip,
    destinationPort: a.destination_port || 80,
    protocol: a.protocol || 'TCP',
    serverId: a.server_id ? String(a.server_id) : '',
    serverName: serverName || (a.server_id ? `Server #${a.server_id}` : 'Unassigned Asset'),
    modelScore: rawScore,
    anomalyScore: a.anomaly_score,
    detectedAt: a.created_at,
    status: (a.status as AlertStatus) || 'new',
    evidence: evidenceList,
    structured_evidence: a.evidence,
    occurrence_count: a.occurrence_count || 1,
    first_seen_at: a.first_seen_at,
    last_seen_at: a.last_seen_at,
    model_version: a.model_version || undefined,
    history: a.history,
    timeline,
    notes: a.history?.filter(h => h.note).map(h => `${h.changed_by}: ${h.note}`),
  };
}

export const alertsApi = {
  async getAlerts(params: {
    severity?: string;
    threat_class?: string;
    status?: string;
    server_id?: number;
    source_ip?: string;
    destination_ip?: string;
    import_id?: number;
    search?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<AlertListResponse> {
    const query = new URLSearchParams();
    if (params.severity && params.severity !== 'all') query.append('severity', params.severity);
    if (params.threat_class && params.threat_class !== 'all') query.append('threat_class', params.threat_class);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.server_id !== undefined) query.append('server_id', String(params.server_id));
    if (params.source_ip) query.append('source_ip', params.source_ip);
    if (params.destination_ip) query.append('destination_ip', params.destination_ip);
    if (params.import_id !== undefined) query.append('import_id', String(params.import_id));
    if (params.search) query.append('search', params.search);
    if (params.page !== undefined) query.append('page', String(params.page));
    if (params.page_size !== undefined) query.append('page_size', String(params.page_size));

    const url = `${API_BASE_URL}/api/alerts${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<AlertListResponse>(res);
  },

  async getAlertSummary(): Promise<AlertSummary> {
    const res = await fetch(`${API_BASE_URL}/api/alerts/summary`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<AlertSummary>(res);
  },

  async getAlertById(id: string | number): Promise<BackendAlert> {
    const res = await fetch(`${API_BASE_URL}/api/alerts/${id}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<BackendAlert>(res);
  },

  async updateAlertStatus(
    id: string | number,
    status: AlertStatus,
    note?: string,
    operator: string = 'Habib Ahmed (Lead Analyst)'
  ): Promise<BackendAlert> {
    const res = await fetch(`${API_BASE_URL}/api/alerts/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        status,
        note: note || undefined,
        operator
      })
    });
    return handleResponse<BackendAlert>(res);
  },

  async runDetection(payload: {
    import_id?: number;
    dataset_id?: number;
    flow_ids?: number[];
    classifier_model_id?: number;
    anomaly_model_id?: number;
    confidence_threshold?: number;
    anomaly_threshold?: number;
  }): Promise<DetectionJob> {
    const res = await fetch(`${API_BASE_URL}/api/detection/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleResponse<DetectionJob>(res);
  },

  async getDetectionJobs(): Promise<{ total: number; items: DetectionJob[] }> {
    const res = await fetch(`${API_BASE_URL}/api/detection/jobs`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<{ total: number; items: DetectionJob[] }>(res);
  },

  async getDetectionHealth(): Promise<DetectionHealth> {
    const res = await fetch(`${API_BASE_URL}/api/detection/health`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<DetectionHealth>(res);
  }
};
