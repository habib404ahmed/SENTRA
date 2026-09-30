import { 
  TrafficDataPoint, 
  ThreatDistributionItem, 
  KPIMetrics 
} from '@/types';

export const mockKpiMetrics: KPIMetrics = {
  monitoredServers: {
    value: 6,
    changeText: '+2 assets this week',
    trend: 'up'
  },
  activeThreats: {
    value: 4,
    criticalCount: 2,
    changeText: '2 critical under investigation',
    trend: 'down'
  },
  trafficAnalyzed: {
    value: '24.8 GB',
    period: 'Last 24 hours',
    rawGb: 24.8
  },
  threatsDetected: {
    value: 27,
    period: 'Last 24 hours',
    changeText: '+5 vs previous period'
  },
  modelMetricPlaceholder: {
    title: 'Detection Engine Benchmark',
    f1ScoreDemo: '96.4%',
    baselineAccuracy: '98.1%',
    latencyAvg: '14.2 ms',
    isDemo: true,
    note: 'Demo / Offline Benchmark (Phase 1 Baseline placeholder, not live production measured)'
  }
};

export const mockThreatDistribution: ThreatDistributionItem[] = [
  { category: 'DDoS', count: 9, percentage: 33, color: '#f43f5e', trend: '+12%' },
  { category: 'Reconnaissance / Port Scan', count: 6, percentage: 22, color: '#f97316', trend: '+4%' },
  { category: 'DNS Tunneling / DGA', count: 4, percentage: 15, color: '#eab308', trend: '-2%' },
  { category: 'Botnet C2 Beaconing', count: 3, percentage: 11, color: '#06b6d4', trend: '0%' },
  { category: 'Encrypted Traffic Anomaly', count: 3, percentage: 11, color: '#8b5cf6', trend: '+3%' },
  { category: 'Data Exfiltration', count: 2, percentage: 8, color: '#10b981', trend: '-1%' },
];

export const mockHourlyTraffic: TrafficDataPoint[] = [
  { timestamp: '00:00', volumeGbps: 0.42, packetsPerSec: 1420, bytesPerSec: 4200000, flowCount: 310, threatEvents: 0 },
  { timestamp: '02:00', volumeGbps: 0.28, packetsPerSec: 980, bytesPerSec: 2800000, flowCount: 210, threatEvents: 0 },
  { timestamp: '04:00', volumeGbps: 0.19, packetsPerSec: 720, bytesPerSec: 1900000, flowCount: 160, threatEvents: 1 },
  { timestamp: '06:00', volumeGbps: 0.55, packetsPerSec: 1850, bytesPerSec: 5500000, flowCount: 420, threatEvents: 0 },
  { timestamp: '08:00', volumeGbps: 1.12, packetsPerSec: 3600, bytesPerSec: 11200000, flowCount: 890, threatEvents: 2 },
  { timestamp: '10:00', volumeGbps: 1.84, packetsPerSec: 5900, bytesPerSec: 18400000, flowCount: 1420, threatEvents: 4 },
  { timestamp: '12:00', volumeGbps: 2.45, packetsPerSec: 8100, bytesPerSec: 24500000, flowCount: 1950, threatEvents: 8 },
  { timestamp: '14:00', volumeGbps: 2.10, packetsPerSec: 7200, bytesPerSec: 21000000, flowCount: 1720, threatEvents: 5 },
  { timestamp: '16:00', volumeGbps: 2.65, packetsPerSec: 9400, bytesPerSec: 26500000, flowCount: 2140, threatEvents: 3 },
  { timestamp: '18:00', volumeGbps: 1.95, packetsPerSec: 6800, bytesPerSec: 19500000, flowCount: 1530, threatEvents: 2 },
  { timestamp: '20:00', volumeGbps: 1.48, packetsPerSec: 4900, bytesPerSec: 14800000, flowCount: 1180, threatEvents: 1 },
  { timestamp: '22:00', volumeGbps: 0.88, packetsPerSec: 2900, bytesPerSec: 8800000, flowCount: 650, threatEvents: 1 }
];

export const mockProtocolDistribution = [
  { name: 'TCP', percentage: 68, color: '#38bdf8', packets: '12.4M', volume: '16.8 GB' },
  { name: 'UDP', percentage: 18, color: '#06b6d4', packets: '4.2M', volume: '4.4 GB' },
  { name: 'TLS/HTTPS', percentage: 9, color: '#818cf8', packets: '2.1M', volume: '2.6 GB' },
  { name: 'DNS (Port 53)', percentage: 4, color: '#f59e0b', packets: '890K', volume: '880 MB' },
  { name: 'ICMP', percentage: 1, color: '#94a3b8', packets: '140K', volume: '120 MB' }
];

export const mockTopSourceIps = [
  { ip: '203.0.113.42', packets: '2.4M', flows: 4820, country: 'External Route', risk: 'High', threat: 'Port Scan' },
  { ip: '198.51.100.88', packets: '6.8M', flows: 14200, country: 'External Route', risk: 'Critical', threat: 'DDoS SYN Flood' },
  { ip: '185.220.101.5', packets: '840K', flows: 890, country: 'External Route', risk: 'High', threat: 'C2 Beacon' },
  { ip: '192.0.2.14', packets: '1.2M', flows: 2100, country: 'External Route', risk: 'Critical', threat: 'DNS Tunneling' },
  { ip: '198.51.100.22', packets: '920K', flows: 1450, country: 'External Route', risk: 'Medium', threat: 'TLS Anomaly' }
];

export const mockTopPorts = [
  { port: 443, service: 'HTTPS', trafficPercent: 54, flows: '94,200', status: 'Normal' },
  { port: 80, service: 'HTTP', trafficPercent: 22, flows: '42,100', status: 'Elevated' },
  { port: 53, service: 'DNS', trafficPercent: 12, flows: '28,400', status: 'Anomalous' },
  { port: 8443, service: 'Alt-HTTPS / Management', trafficPercent: 7, flows: '11,200', status: 'Suspicious' },
  { port: 22, service: 'SSH', trafficPercent: 5, flows: '4,800', status: 'Monitored' }
];
