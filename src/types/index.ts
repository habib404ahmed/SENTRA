export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus = 'active' | 'investigating' | 'resolved';

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
  | 'Data Exfiltration';

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

export interface ThreatAlert {
  id: string;
  threat: ThreatCategory;
  severity: Severity;
  sourceIp: string;
  destinationIp: string;
  destinationPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'TLS';
  serverId: string;
  serverName: string;
  modelScore: number; // e.g. 94 (%)
  detectedAt: string;
  status: AlertStatus;
  evidence: string[];
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
