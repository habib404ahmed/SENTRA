import { ThreatIntelItem, ObservedIP } from '@/types';

export const mockThreatCategoriesIntel: ThreatIntelItem[] = [
  {
    category: 'DDoS',
    title: 'Distributed Denial of Service (Unidirectional Volumetric & State Exhaustion)',
    description: 'High-volume or abnormal traffic patterns consistent with denial-of-service behavior observed via unidirectional ingress taps without needing return-path handshake verification.',
    unidirectionalDetectionMechanism: 'Monitors flow rate deviations, SYN packet ratios without pairing ACKs, small-packet size clusters, and destination port fan-in entropy.',
    riskLevel: 'critical',
    observedCount: 9,
    commonPorts: [80, 443, 53, 123],
    associatedProtocols: ['TCP (SYN)', 'UDP', 'ICMP'],
    keyIndicators: [
      'Ingress PPS exceeding moving baseline by > 3 standard deviations',
      'High ratio of SYN packets to total TCP segment count',
      'Low header-to-payload variance across dispersed source IP ranges',
      'Rapid source subnet cycling (ephemeral source IP spoofing signatures)'
    ]
  },
  {
    category: 'Reconnaissance / Port Scan',
    title: 'Network Reconnaissance & Port Scanning',
    description: 'Rapid connection attempts across multiple ports or hosts indicating automated network mapping, service discovery, or vulnerability profiling.',
    unidirectionalDetectionMechanism: 'Tracks source IP destination port fan-out rates, sequential/random port targeting, and failed connection attempt frequency over sliding sliding time windows.',
    riskLevel: 'high',
    observedCount: 6,
    commonPorts: [21, 22, 23, 80, 443, 445, 3389, 8080],
    associatedProtocols: ['TCP', 'UDP'],
    keyIndicators: [
      'Single observed source IP contacting > 20 distinct destination ports within 10 seconds',
      'SYN packet distribution across closed or unassigned service ports',
      'Predictable TCP initial sequence number (ISN) increments characteristic of scanning tools (e.g. Masscan, Nmap)',
      'Subnet horizontal sweeps targeting identical ports across multiple internal assets'
    ]
  },
  {
    category: 'Botnet C2 Beaconing',
    title: 'Command and Control (C2) Periodic Beaconing',
    description: 'Repeated periodic communication patterns that may indicate automated command-and-control check-in behavior.',
    unidirectionalDetectionMechanism: 'Employs spectral analysis (FFT) and inter-arrival time (IAT) variance algorithms to detect low-jitter periodic pulses even through one-way data diode sensors.',
    riskLevel: 'high',
    observedCount: 3,
    commonPorts: [80, 443, 8080, 8443, 53],
    associatedProtocols: ['TCP', 'TLS', 'DNS', 'HTTP'],
    keyIndicators: [
      'Statistically rigid inter-arrival times (e.g. fixed 60s, 300s heartbeat intervals with jitter < 5%)',
      'Consistent payload size distributions across prolonged observation periods',
      'Periodic transmission persists independent of human operational hours',
      'Destination reputation matching known dynamic DNS or bulletproof hosting providers'
    ]
  },
  {
    category: 'DNS Tunneling / DGA',
    title: 'DNS Tunneling & Domain Generation Algorithms (DGA)',
    description: 'Suspicious DNS query characteristics and abnormal domain behavior, such as high-entropy query labels, excessive TXT record volume, or programmatic domain generation.',
    unidirectionalDetectionMechanism: 'Extracts lexical features from query strings (Shannon entropy, consonant-vowel ratios, n-gram frequencies) and monitors volume surges in TXT/NULL record queries.',
    riskLevel: 'critical',
    observedCount: 4,
    commonPorts: [53, 853],
    associatedProtocols: ['DNS (UDP/TCP)', 'DoT'],
    keyIndicators: [
      'Subdomain label Shannon entropy score > 4.2',
      'Abnormally long fully qualified domain names (> 50 octets)',
      'Elevated ratio of NXDOMAIN (Non-Existent Domain) responses in downstream telemetry',
      'Consecutive queries encoding base32/base64 binary payloads into hostname prefixes'
    ]
  },
  {
    category: 'Data Exfiltration',
    title: 'Covert or High-Volume Data Exfiltration',
    description: 'Unusual outbound or unidirectional egress transfer patterns representing unauthorized bulk data movement or slow-drip exfiltration channels.',
    unidirectionalDetectionMechanism: 'Monitors sustained bandwidth spikes, flow duration anomalies, off-hours egress deviations, and non-standard protocol tunneling.',
    riskLevel: 'critical',
    observedCount: 2,
    commonPorts: [443, 80, 22, 9001],
    associatedProtocols: ['TCP', 'TLS', 'SSH', 'Encrypted Raw Stream'],
    keyIndicators: [
      'Unidirectional flow volume exceeding 10x historical baseline for originating host',
      'Sustained full-MTU packet transmission to novel external destination IPs',
      'Off-peak data transfers originating from sensitive internal database or storage servers',
      'Unusual byte entropy consistent with encrypted archives (e.g. 7z, AES ciphertext)'
    ]
  },
  {
    category: 'Encrypted Traffic Anomaly',
    title: 'Encrypted Traffic Behavioral Anomaly',
    description: 'Suspicious behavioral characteristics observed in encrypted flows (TLS/SSH/QUIC) without requiring payload decryption, preserving privacy and cipher integrity.',
    unidirectionalDetectionMechanism: 'Evaluates packet length sequences, inter-arrival time distributions, TLS ClientHello fingerprints (JA3/JA4), and cipher suite offering entropy.',
    riskLevel: 'medium',
    observedCount: 3,
    commonPorts: [443, 8443, 4433],
    associatedProtocols: ['TLS 1.2/1.3', 'QUIC', 'SSH'],
    keyIndicators: [
      'Non-standard TLS ClientHello extension order or rare cipher suite offerings',
      'Packet size progression during handshake diverging from typical browser profiles',
      'High packet burstiness without corresponding user interaction cadence',
      'Self-signed certificates or anomalous SNI (Server Name Indication) mismatches'
    ]
  }
];

export const mockObservedIps: ObservedIP[] = [
  {
    ip: '203.0.113.42',
    country: 'Observed External Subnet',
    organization: 'Autonomous System AS64496',
    threatScore: 94,
    associatedThreats: ['Reconnaissance / Port Scan'],
    firstSeen: '2026-09-30 04:12',
    lastSeen: '2026-09-30 13:22',
    packetCount: '2.4M',
    status: 'Flagged'
  },
  {
    ip: '198.51.100.88',
    country: 'Observed External Subnet',
    organization: 'Autonomous System AS64500',
    threatScore: 97,
    associatedThreats: ['DDoS'],
    firstSeen: '2026-09-30 08:30',
    lastSeen: '2026-09-30 13:18',
    packetCount: '6.8M',
    status: 'Flagged'
  },
  {
    ip: '192.0.2.14',
    country: 'Observed External Subnet',
    organization: 'Dynamic DNS Relay Host',
    threatScore: 91,
    associatedThreats: ['DNS Tunneling / DGA'],
    firstSeen: '2026-09-29 22:15',
    lastSeen: '2026-09-30 12:45',
    packetCount: '1.2M',
    status: 'Flagged'
  },
  {
    ip: '185.220.101.5',
    country: 'Observed External Subnet',
    organization: 'Hosting Provider Network',
    threatScore: 88,
    associatedThreats: ['Botnet C2 Beaconing'],
    firstSeen: '2026-09-30 01:05',
    lastSeen: '2026-09-30 11:30',
    packetCount: '840K',
    status: 'Under Review'
  },
  {
    ip: '198.51.100.22',
    country: 'Internal QA / Partner Range',
    organization: 'Load Testing Service Provider',
    threatScore: 62,
    associatedThreats: ['Encrypted Traffic Anomaly'],
    firstSeen: '2026-09-30 09:00',
    lastSeen: '2026-09-30 10:14',
    packetCount: '920K',
    status: 'Monitored'
  }
];
