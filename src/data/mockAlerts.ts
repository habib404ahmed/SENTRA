import { ThreatAlert } from '@/types';

export const initialMockAlerts: ThreatAlert[] = [
  {
    id: 'ALT-8921',
    threat: 'Reconnaissance / Port Scan',
    severity: 'high',
    sourceIp: '203.0.113.42',
    destinationIp: '10.0.0.30',
    destinationPort: 443,
    protocol: 'TCP',
    serverId: 'srv-003',
    serverName: 'Authentication Server',
    modelScore: 94,
    detectedAt: '2026-09-30 13:22:15',
    status: 'active',
    evidence: [
      'High port diversity: Inbound SYN probes across 48 target ports within 3.2 seconds',
      'Rapid connection attempts with zero payload acknowledgment',
      'Abnormal connection rate (18.6x above historical baseline for source subnet)',
      'TCP flags: SYN without standard application-layer handshake progression'
    ],
    timeline: [
      { time: '13:22:10', event: 'Unidirectional Traffic Ingestion', details: 'Ingested 420 packets via optical tap interface eth0' },
      { time: '13:22:12', event: 'Feature Vector Extraction', details: 'Extracted flow symmetry, SYN ratio (0.98), and inter-arrival jitter (1.2ms)' },
      { time: '13:22:14', event: 'Model Evaluation', details: 'Random Forest classifier scored pattern at 0.94 anomaly confidence' },
      { time: '13:22:15', event: 'Alert Dispatched', details: 'Severity HIGH assigned based on sensitive asset designation (Auth Server)' }
    ],
    notes: [
      'Analyst Note (Auto): Subnet 203.0.113.0/24 flagged previously in threat intelligence watchlist.'
    ],
    packetSample: {
      headerSize: 40,
      payloadSize: 0,
      flags: '0x002 (SYN)',
      windowSize: 1024
    }
  },
  {
    id: 'ALT-8920',
    threat: 'DDoS',
    severity: 'critical',
    sourceIp: '198.51.100.88',
    destinationIp: '10.0.0.10',
    destinationPort: 80,
    protocol: 'TCP',
    serverId: 'srv-001',
    serverName: 'E-Commerce Web Server',
    modelScore: 97,
    detectedAt: '2026-09-30 13:18:40',
    status: 'active',
    evidence: [
      'Volumetric traffic surge: Ingress packets per second jumped to 14,800 pps',
      'High destination fan-in from distributed source subnets',
      'Fixed small packet length signature (64 bytes average per flow frame)',
      'SYN-flood profile: Unidirectional flow lacks completion handshake'
    ],
    timeline: [
      { time: '13:18:25', event: 'Traffic Spike Ingestion', details: 'Inbound buffer utilization reached 78% on tap mirror' },
      { time: '13:18:31', event: 'Statistical Anomaly Flag', details: 'Z-score threshold exceeded (4.8 standard deviations above moving median)' },
      { time: '13:18:36', event: 'Classifier Trigger', details: 'Supervised ML ensemble matched distributed SYN-flood fingerprint (Score: 0.97)' },
      { time: '13:18:40', event: 'Incident Escalated', details: 'Triggered Critical Priority SOC alert' }
    ],
    notes: [
      'E-commerce front-end mitigation rules recommended upstream at edge BGP router.'
    ],
    packetSample: {
      headerSize: 20,
      payloadSize: 44,
      flags: '0x002 (SYN)',
      windowSize: 512
    }
  },
  {
    id: 'ALT-8919',
    threat: 'DNS Tunneling / DGA',
    severity: 'critical',
    sourceIp: '192.0.2.14',
    destinationIp: '10.0.0.40',
    destinationPort: 53,
    protocol: 'DNS',
    serverId: 'srv-004',
    serverName: 'Internal DNS Resolver',
    modelScore: 91,
    detectedAt: '2026-09-30 12:45:02',
    status: 'investigating',
    evidence: [
      'High Shannon entropy score (4.62) observed in DNS query subdomain labels',
      'Suspicious TXT record volume with base64-encoded strings',
      'Query rate anomaly to unregistered dynamic apex domain (nxdomain ratio: 62%)',
      'Unusually large DNS payload lengths exceeding 512 octets over UDP'
    ],
    timeline: [
      { time: '12:44:30', event: 'DNS Telemetry Ingest', details: 'Passive NetFlow sensor observed 340 consecutive TXT lookups' },
      { time: '12:44:48', event: 'Entropy & DGA Analysis', details: 'Lexical analysis detected domain generation algorithm pattern' },
      { time: '12:45:00', event: 'Inference Engine', details: 'Model score 91% for covert unidirectional DNS exfiltration tunneling' },
      { time: '12:45:02', event: 'SOC Notification', details: 'Assigned to L2 Security Analyst queue' }
    ],
    notes: [
      'Under active inspection. Queried apex domain candidate for sinkholing.'
    ],
    packetSample: {
      headerSize: 28,
      payloadSize: 534,
      flags: '0x0100 (Standard Query)',
      windowSize: 0
    }
  },
  {
    id: 'ALT-8918',
    threat: 'Botnet C2 Beaconing',
    severity: 'high',
    sourceIp: '185.220.101.5',
    destinationIp: '10.0.0.30',
    destinationPort: 8443,
    protocol: 'TCP',
    serverId: 'srv-003',
    serverName: 'Authentication Server',
    modelScore: 88,
    detectedAt: '2026-09-30 11:30:19',
    status: 'investigating',
    evidence: [
      'Periodic heartbeat interval: Fixed 60.02s inter-arrival timing (jitter < 0.8%)',
      'Identical packet sizes (128 bytes) across 45 consecutive communication windows',
      'Destination port 8443 TLS Client Hello with non-standard cipher suite list',
      'Behavioral correlation with known Cobalt Strike / C2 beacon profiles'
    ],
    timeline: [
      { time: '11:15:00', event: 'Long-term Window Profiling', details: 'Sliding window accumulated 45 periodic connection events' },
      { time: '11:28:10', event: 'Spectral Analysis', details: 'Fourier transform highlighted sharp spectral peak at f = 0.0166 Hz' },
      { time: '11:30:15', event: 'Confidence Calculation', details: 'Isolation Forest + Time-Series model verified beacon regularity' },
      { time: '11:30:19', event: 'Alert Generated', details: 'Investigation opened by SOC automated workflow' }
    ],
    notes: []
  },
  {
    id: 'ALT-8917',
    threat: 'Encrypted Traffic Anomaly',
    severity: 'medium',
    sourceIp: '198.51.100.22',
    destinationIp: '10.0.0.10',
    destinationPort: 443,
    protocol: 'TLS',
    serverId: 'srv-001',
    serverName: 'E-Commerce Web Server',
    modelScore: 79,
    detectedAt: '2026-09-30 10:14:55',
    status: 'resolved',
    evidence: [
      'Unusual byte distribution: High Kurtosis observed in initial 10 encrypted packets',
      'ClientHello fingerprint matches headless automated scraping framework',
      'Absence of standard browser TLS extensions (e.g. padding, grease)',
      'Non-human burst pattern: 250 requests within 400 milliseconds'
    ],
    timeline: [
      { time: '10:14:20', event: 'TLS Metadata Inspection', details: 'Extracted JA3/JA4 fingerprint from unidirectional tap mirror' },
      { time: '10:14:40', event: 'Heuristic & ML Classification', details: 'Score: 79% (Automated bot / anomaly)' },
      { time: '10:14:55', event: 'Alert Logged', details: 'Resolved after verification against internal authorized load tester IP' }
    ],
    notes: [
      'Resolved: Verified as scheduled performance benchmark from internal QA load testing partner.'
    ]
  },
  {
    id: 'ALT-8916',
    threat: 'Data Exfiltration',
    severity: 'critical',
    sourceIp: '10.0.0.50',
    destinationIp: '203.0.113.199',
    destinationPort: 443,
    protocol: 'TCP',
    serverId: 'srv-005',
    serverName: 'Inventory & Catalog API',
    modelScore: 92,
    detectedAt: '2026-09-30 08:05:12',
    status: 'resolved',
    evidence: [
      'Unidirectional egress volume asymmetry: Sustained outbound stream exceeding 450 MB/min',
      'Connection initiated to unclassified external IP with no prior reputation history',
      'Off-hours transmission with continuous full MTU packet sizes (1500 bytes)',
      'Deviation from standard catalog query burst baseline'
    ],
    timeline: [
      { time: '08:01:00', event: 'Bandwidth Deviation Trigger', details: 'Egress rate reached 9.4 MB/s from internal database proxy' },
      { time: '08:04:30', event: 'Model Score Computed', details: 'Deep anomaly model scored flow as 0.92 malicious exfiltration probability' },
      { time: '08:05:12', event: 'High Severity Escalation', details: 'Contained and routed to forensic investigation' }
    ],
    notes: [
      'Resolved: Database backup replication route rerouted to official S3 cold storage endpoint.'
    ]
  }
];
