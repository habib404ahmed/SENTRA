import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Button } from '@/components/common/Button';
import { MonitoredServer, ServerEnvironment, TrafficSourceType } from '@/types';
import { Database, Info } from 'lucide-react';

interface EditServerModalProps {
  server: MonitoredServer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditServerModal: React.FC<EditServerModalProps> = ({ server, isOpen, onClose }) => {
  const { updateServer } = useApp();

  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [serverType, setServerType] = useState('Web Application Server (Nginx / Node)');
  const [environment, setEnvironment] = useState<ServerEnvironment>('production');
  const [trafficSource, setTrafficSource] = useState<TrafficSourceType>('Optical Diode Tap');
  const [monitoringStatus, setMonitoringStatus] = useState<'active' | 'paused'>('active');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (server) {
      setName(server.name);
      setHostname(server.hostname);
      setIpAddress(server.ipAddress);
      setServerType(server.serverType);
      setEnvironment(server.environment);
      setTrafficSource(server.trafficSource);
      setMonitoringStatus(server.monitoringStatus === 'paused' ? 'paused' : 'active');
      setDescription(server.description || '');
      setErrors({});
    }
  }, [server]);

  const validateIp = (ip: string) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!server) return;

    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Server Name is required';
    if (!hostname.trim()) newErrors.hostname = 'Hostname is required';
    if (!ipAddress.trim()) {
      newErrors.ipAddress = 'IP Address is required';
    } else if (!validateIp(ipAddress)) {
      newErrors.ipAddress = 'Invalid IPv4 address format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const success = await updateServer(server.id, {
      name: name.trim(),
      hostname: hostname.trim(),
      ip_address: ipAddress.trim(),
      server_type: serverType,
      environment,
      traffic_source: trafficSource,
      status: monitoringStatus,
      description: description.trim(),
    });

    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  if (!server) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Asset: ${server.name}`}
      subtitle={`Database ID: ${server.id} • Modifying registered PostgreSQL asset record`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-slate-300">
          <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-emerald-400">PostgreSQL Synced:</span> Updates are persisted directly to the <code className="text-slate-200">monitored_servers</code> table via SQLAlchemy.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Server Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />

          <Input
            label="Hostname / FQDN *"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            error={errors.hostname}
          />

          <Input
            label="IP Address *"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            error={errors.ipAddress}
          />

          <Select
            label="Server Archetype / Role"
            value={serverType}
            onChange={(e) => setServerType(e.target.value)}
            options={[
              { value: 'Web Server', label: 'Web Server' },
              { value: 'Web Application Server (Nginx / Node)', label: 'Web Application Server (Nginx / Node)' },
              { value: 'Core Database Cluster (PostgreSQL)', label: 'Core Database Cluster (PostgreSQL)' },
              { value: 'API Gateway & Microservices', label: 'API Gateway & Microservices' },
              { value: 'Identity & Access Manager (Keycloak)', label: 'Identity & Access Manager (Keycloak)' },
              { value: 'Border Router / Edge Gateway', label: 'Border Router / Edge Gateway' },
              { value: 'DMZ Reverse Proxy', label: 'DMZ Reverse Proxy' },
              { value: 'Storage & Backup Vault', label: 'Storage & Backup Vault' }
            ]}
          />

          <Select
            label="Deployment Environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as ServerEnvironment)}
            options={[
              { value: 'production', label: 'Production (Critical)' },
              { value: 'staging', label: 'Staging' },
              { value: 'development', label: 'Development' },
              { value: 'dmz', label: 'DMZ (Perimeter)' },
              { value: 'Demo', label: 'Demo' }
            ]}
          />

          <Select
            label="Traffic Ingestion Tap"
            value={trafficSource}
            onChange={(e) => setTrafficSource(e.target.value as TrafficSourceType)}
            options={[
              { value: 'Optical Diode Tap', label: 'Optical Diode Tap (Fiber Splitter)' },
              { value: 'Mirrored Traffic', label: 'Mirrored Traffic (SPAN / Switch Port)' },
              { value: 'Flow Telemetry', label: 'Flow Telemetry (Active Flow Exporter)' },
              { value: 'NetFlow', label: 'NetFlow v9 Flow Records' },
              { value: 'IPFIX', label: 'IPFIX Telemetry Stream' },
              { value: 'PCAP', label: 'PCAP Offline Replay' },
              { value: 'Other Authorized Flow Source', label: 'Other Authorized Flow Source' }
            ]}
          />

          <Select
            label="Monitoring State"
            value={monitoringStatus}
            onChange={(e) => setMonitoringStatus(e.target.value as 'active' | 'paused')}
            options={[
              { value: 'active', label: 'Active Tap (Ingesting)' },
              { value: 'paused', label: 'Paused (Telemetry Ignored)' }
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Asset Description / Operational Role
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sentra-cyan/20 resize-none font-mono"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
