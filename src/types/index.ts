export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive' | 'active';

export type ServerEnvironment = 'production' | 'staging' | 'development' | 'dmz';

export type TrafficSourceType = 
  | 'PCAP' 
  | 'NetFlow' 
  | 'IPFIX' 
  | 'Mirrored Traffic' 
  | 'Optical Diode Tap' 
  | 'Other Authorized Flow Source';

export type ThreatCategory = 
  | 'DDoS'
  | 'Botnet C2 Beaconing'
  | 'DNS Tunneling / DGA'
  | 'Encrypted Traffic Anomaly'
  | 'Reconnaissance / Port Scan'
  | 'Data Exfiltration'
  | string;

export interface MonitoredServer {
  id: string;
  name: string;
  ipAddress: string;
  hostname: string;
  serverType: string;
  environment: ServerEnvironment;
  trafficSource: TrafficSourceType;
  monitoringStatus: 'active' | 'paused' | 'degraded';
  lastActivity: string;
  activeThreats: number;
  description: string;
  stats: {
    packetsProcessed: string;
    bytesProcessed: string;
    flowCount: string;
    connectionRate: string; // e.g. "1.4k/s"
    pps: number;
    bandwidthMbps: number;
  };
}

export interface AlertHistoryItem {
  id: number;
  alert_id: number;
  previous_status?: string | null;
  previousStatus?: string | null;
  new_status: string;
  newStatus?: string;
  changed_by: string;
  changedBy?: string;
  note?: string | null;
  created_at: string;
  changedAt?: string;
}

export interface ThreatAlert {
  id: string;
  threat: ThreatCategory;
  threat_class?: string;
  threatClass?: string;
  detection_type?: string;
  detectionType?: string;
  detection_decision?: string;
  detectionDecision?: string;
  severity: Severity;
  sourceIp: string;
  destinationIp: string;
  destinationPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'TLS' | string;
  serverId: string;
  serverName: string;
  modelScore: number; // e.g. 94 (%)
  anomalyScore?: number | null;
  detectedAt: string;
  status: AlertStatus;
  evidence: string[];
  structured_evidence?: Record<string, any>;
  structuredEvidence?: Record<string, any>;
  occurrence_count?: number;
  occurrenceCount?: number;
  first_seen_at?: string;
  firstSeenAt?: string;
  last_seen_at?: string;
  lastSeenAt?: string;
  model_version?: string;
  modelVersion?: string;
  feature_schema_version?: string;
  featureSchemaVersion?: string;
  detection_policy_version?: string;
  detectionPolicyVersion?: string;
  flow_id?: string;
  flowId?: string;
  import_id?: string;
  importId?: string;
  history?: AlertHistoryItem[];
  timeline: {
    time: string;
    event: string;
    details: string;
  }[];
  notes?: string[];
  packetSample?: {
    headerSize: number;
    payloadSize: number;
    flags: string;
    windowSize: number;
  };
}

export interface DetectionJob {
  id: number;
  import_id?: number | null;
  dataset_id?: number | null;
  classifier_model_id?: number | null;
  anomaly_model_id?: number | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  policy_version: string;
  total_flows: number;
  analyzed_flows: number;
  alerts_generated: number;
  configuration: Record<string, any>;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface DetectionHealth {
  status: string;
  subsystem: string;
  policy_version: string;
  active_classifier?: Record<string, any> | null;
  active_anomaly_detector?: Record<string, any> | null;
  inference_ready: boolean;
}

export interface TrafficDataPoint {
  timestamp: string;
  volumeGbps: number;
  packetsPerSec: number;
  bytesPerSec: number;
  flowCount: number;
  threatEvents: number;
}

export interface ThreatDistributionItem {
  category: ThreatCategory;
  count: number;
  percentage: number;
  color: string;
  trend: string;
}

export interface ThreatIntelItem {
  category: ThreatCategory;
  title: string;
  description: string;
  unidirectionalDetectionMechanism: string;
  riskLevel: Severity;
  observedCount: number;
  commonPorts: number[];
  associatedProtocols: string[];
  keyIndicators: string[];
}

export interface ObservedIP {
  ip: string;
  country: string;
  organization: string;
  threatScore: number;
  associatedThreats: ThreatCategory[];
  firstSeen: string;
  lastSeen: string;
  packetCount: string;
  status: 'Flagged' | 'Monitored' | 'Under Review';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'alert' | 'server' | 'system';
  severity?: Severity;
  linkTo?: string;
}

export interface KPIMetrics {
  monitoredServers: {
    value: number;
    changeText: string;
    trend: 'up' | 'down' | 'neutral';
  };
  activeThreats: {
    value: number;
    criticalCount: number;
    changeText: string;
    trend: 'up' | 'down' | 'neutral';
  };
  trafficAnalyzed: {
    value: string;
    period: string;
    rawGb: number;
  };
  threatsDetected: {
    value: number;
    period: string;
    changeText: string;
  };
  modelMetricPlaceholder: {
    title: string;
    f1ScoreDemo: string;
    baselineAccuracy: string;
    latencyAvg: string;
    isDemo: boolean;
    note: string;
  };
}

export type PcapImportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface PcapImport {
  id: number;
  server_id?: number | null;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  status: PcapImportStatus;
  total_packets: number;
  total_flows: number;
  error_message?: string | null;
  uploaded_at: string;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  server_name?: string | null;
}

export interface PcapImportList {
  items: PcapImport[];
  total: number;
  skip: number;
  limit: number;
}

export interface TrafficFlow {
  id: number;
  import_id: number;
  server_id?: number | null;
  source_ip: string;
  destination_ip: string;
  source_port?: number | null;
  destination_port?: number | null;
  protocol: string;
  start_time?: string | null;
  end_time?: string | null;
  duration: number;
  packet_count: number;
  byte_count: number;
  average_packet_size: number;
  packets_per_second: number;
  bytes_per_second: number;
  average_interarrival_time: number;
  tcp_syn_count: number;
  tcp_ack_count: number;
  tcp_fin_count: number;
  tcp_rst_count: number;
  server_name?: string | null;
}

export interface TrafficFlowList {
  items: TrafficFlow[];
  total: number;
  skip: number;
  limit: number;
}

export type FeatureJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface DataQualityReport {
  total_input_records: number;
  valid_records: number;
  invalid_records: number;
  duplicate_records: number;
  records_excluded: number;
  missing_value_counts: Record<string, number>;
  invalid_value_counts: Record<string, number>;
  exclusion_reasons: Record<string, number>;
  remediation_actions: string[];
}

export interface FeatureJob {
  id: number;
  import_id?: number | null;
  server_id?: number | null;
  status: FeatureJobStatus;
  schema_version: string;
  input_flows: number;
  valid_flows: number;
  invalid_flows: number;
  generated_features: number;
  quality_report?: DataQualityReport | null;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface FeatureJobList {
  total: number;
  items: FeatureJob[];
}

export interface FeatureDefinition {
  name: string;
  data_type: string;
  description: string;
  source_field: string;
  calculation_method: string;
  missing_value_behavior: string;
  feature_scope: string;
  is_model_feature: boolean;
}

export interface FeatureSchemaMetadata {
  version: string;
  description: string;
  total_features: number;
  model_feature_count: number;
  features: FeatureDefinition[];
}

export interface FlowFeatureRecord {
  id: number;
  job_id: number;
  flow_id: number;
  schema_version: string;
  feature_values: Record<string, any>;
  created_at: string;
}

export interface FlowFeatureList {
  total: number;
  page: number;
  page_size: number;
  items: FlowFeatureRecord[];
}

export interface FeatureDataset {
  id: number;
  job_id: number;
  name: string;
  format: 'csv' | 'parquet';
  dataset_type: 'unlabeled_ml_ready' | 'full_analyzed';
  file_size: number;
  row_count: number;
  column_count: number;
  sha256_hash?: string | null;
  created_at: string;
}

export interface FeatureDatasetList {
  total: number;
  items: FeatureDataset[];
}

// --- Phase 5: Machine Learning Types ---

export interface MLDataset {
  id: number;
  name: string;
  source: string;
  version: string;
  file_path: string;
  format: string;
  feature_schema_version: string;
  label_column: string;
  record_count: number;
  class_count: number;
  classes: string[];
  validation_status: string;
  description?: string | null;
  created_at: string;
}

export interface MLDatasetList {
  total: number;
  items: MLDataset[];
}

export type MLModelType = 'classifier' | 'anomaly_detector';

export interface MLTrainingJob {
  id: number;
  dataset_id: number;
  model_type: MLModelType;
  algorithm: string;
  hyperparameters: Record<string, any>;
  status: 'queued' | 'training' | 'completed' | 'failed';
  output_model_id?: number | null;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface MLTrainingJobList {
  total: number;
  items: MLTrainingJob[];
}

export interface MLModel {
  id: number;
  name: string;
  model_type: MLModelType;
  algorithm: string;
  version: string;
  feature_schema_version: string;
  dataset_id?: number | null;
  hyperparameters: Record<string, any>;
  feature_names: string[];
  classes?: string[] | null;
  status: string;
  created_at: string;
}

export interface MLModelList {
  total: number;
  items: MLModel[];
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface MLEvaluation {
  id: number;
  model_id: number;
  dataset_id?: number | null;
  split_method: string;
  test_size: number;
  test_records: number;
  metrics: {
    accuracy?: number;
    macro_precision?: number;
    macro_recall?: number;
    macro_f1?: number;
    weighted_precision?: number;
    weighted_recall?: number;
    weighted_f1?: number;
    normal_false_positive_rate?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    false_positive_rate?: number;
    roc_auc?: number | null;
    score_distribution?: {
      min: number;
      p25?: number;
      median: number;
      p75?: number;
      max: number;
    };
  };
  confusion_matrix?: {
    labels: string[];
    matrix: number[][];
  } | null;
  per_class_metrics?: Record<string, {
    precision: number;
    recall: number;
    f1_score: number;
    support: number;
  }> | null;
  feature_importances?: FeatureImportanceItem[] | null;
  report_summary?: string | null;
  created_at: string;
}

export interface MLPredictResponse {
  model_type: MLModelType;
  predicted_class?: string | null;
  confidence?: number | null;
  class_probabilities?: Record<string, number> | null;
  is_anomaly?: boolean | null;
  anomaly_score?: number | null;
  threshold?: number | null;
  interpretation?: string | null;
  model_version: string;
  feature_schema_version: string;
}

