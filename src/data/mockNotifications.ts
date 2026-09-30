import { NotificationItem } from '@/types';

export const initialMockNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Critical Threat Alert: DDoS Volume Surge',
    description: 'Volumetric SYN-flood signature identified on E-Commerce Web Server (10.0.0.10). Model score: 97%.',
    timestamp: '12 mins ago',
    read: false,
    type: 'alert',
    severity: 'critical',
    linkTo: 'alerts'
  },
  {
    id: 'notif-2',
    title: 'Port Scan Activity Detected',
    description: 'Reconnaissance sweep detected targeting Authentication Server (10.0.0.30) from 203.0.113.42.',
    timestamp: '25 mins ago',
    read: false,
    type: 'alert',
    severity: 'high',
    linkTo: 'alerts'
  },
  {
    id: 'notif-3',
    title: 'Covert DNS Tunneling Flagged',
    description: 'High entropy DNS TXT query anomaly observed at Internal DNS Resolver (10.0.0.40).',
    timestamp: '1 hour ago',
    read: false,
    type: 'alert',
    severity: 'critical',
    linkTo: 'alerts'
  },
  {
    id: 'notif-4',
    title: 'Telemetry Ingestion Steady',
    description: 'Unidirectional optical tap sensor eth0 running at normal packet buffer capacity (0 dropped frames).',
    timestamp: '3 hours ago',
    read: true,
    type: 'system',
    severity: 'info',
    linkTo: 'analytics'
  },
  {
    id: 'notif-5',
    title: 'Staging Server Paused',
    description: 'Staging Ingress Proxy monitoring was paused by Security Administrator.',
    timestamp: '4 hours ago',
    read: true,
    type: 'server',
    severity: 'low',
    linkTo: 'servers'
  }
];
