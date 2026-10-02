import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Button } from '@/components/common/Button';
import { ServerEnvironment, TrafficSourceType } from '@/types';
import { Shield, Info, AlertCircle } from 'lucide-react';

export const AddServerModal: React.FC = () => {
  const { isAddServerOpen, setIsAddServerOpen, addServer } = useApp();

  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [serverType, setServerType] = useState('Web Application Server (Nginx / Node)');
  const [environment, setEnvironment] = useState<ServerEnvironment>('production');
  const [trafficSource, setTrafficSource] = useState<TrafficSourceType>('Optical Diode Tap');
  const [monitoringStatus, setMonitoringStatus] = useState<'active' | 'paused'>('active');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate IPv4 format
  const validateIp = (ip: string) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip.trim());
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setErrors({});
    setSubmitError(null);
    setIsAddServerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Server Name is required';
    }
    if (!hostname.trim()) {
      newErrors.hostname = 'Hostname is required';
    }
    if (!ipAddress.trim()) {
      newErrors.ipAddress = 'IP Address is required';
    } else if (!validateIp(ipAddress)) {
      newErrors.ipAddress = 'Invalid IPv4 address format (e.g. 10.0.0.60)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    const result = await addServer({
      name: name.trim(),
      hostname: hostname.trim(),
      ipAddress: ipAddress.trim(),
      serverType,
      environment,
      trafficSource,
      monitoringStatus,
      description: description.trim() || 'Internal authorized network asset for unidirectional cybersecurity monitoring.',
    });

    setIsSubmitting(false);
    if (result.success) {
      // Reset form
      setName('');
      setHostname('');
      setIpAddress('');
      setDescription('');
      setErrors({});
      setSubmitError(null);
      setIsAddServerOpen(false);
    } else {
      setSubmitError(result.error || 'Failed to register server in database.');
    }
  };

  return (
    <Modal
      isOpen={isAddServerOpen}
      onClose={handleClose}
      title="Register Monitored Network Asset"
      subtitle="Configure an authorized host for passive unidirectional flow monitoring"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-server-form">
        {/* Notice on Unidirectional Ingestion */}
        <div className="p-3 rounded-lg bg-sentra-cyan/10 border border-sentra-cyan/25 flex items-start gap-2.5 text-xs text-slate-300">
          <Info className="w-4 h-4 text-sentra-cyan shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-sentra-cyan">Passive Ingestion Mode:</span> Registration establishes a read-only telemetry tap. SENTRA will not transmit packets or probe the asset directly.
          </div>
        </div>

        {/* Backend Error Banner */}
        {submitError && (
          <div 
            role="alert"
            className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-rose-300">Registration Error:</span> {submitError}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Server Name *"
            placeholder="e.g. Inventory Master DB"
            value={name}
            disabled={isSubmitting}
            onChange={(e) => {
              setName(e.target.value);
              if (submitError) setSubmitError(null);
              if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
            }}
            error={errors.name}
          />

          <Input
            label="IP Address *"
            placeholder="e.g. 10.0.0.60"
            value={ipAddress}
            disabled={isSubmitting}
            onChange={(e) => {
              setIpAddress(e.target.value);
              if (submitError) setSubmitError(null);
              if (errors.ipAddress) setErrors(prev => ({ ...prev, ipAddress: '' }));
            }}
            error={errors.ipAddress}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Hostname *"
            placeholder="e.g. db-master-01.internal.corp"
            value={hostname}
            disabled={isSubmitting}
            onChange={(e) => {
              setHostname(e.target.value);
              if (submitError) setSubmitError(null);
              if (errors.hostname) setErrors(prev => ({ ...prev, hostname: '' }));
            }}
            error={errors.hostname}
          />

          <Select
            label="Server Type"
            value={serverType}
            disabled={isSubmitting}
            onChange={(e) => setServerType(e.target.value)}
            options={[
              { value: 'Web Application Server (Nginx / Node)', label: 'Web Application Server (Nginx / Node)' },
              { value: 'Financial Transaction Gateway', label: 'Financial Transaction Gateway' },
              { value: 'Identity & Access Manager (OAuth2 / LDAP)', label: 'Identity & Access Manager (OAuth2 / LDAP)' },
              { value: 'Recursive DNS Daemon (BIND / Unbound)', label: 'Recursive DNS Daemon (BIND / Unbound)' },
              { value: 'Microservice Cluster API (gRPC / REST)', label: 'Microservice Cluster API (gRPC / REST)' },
              { value: 'Database / Storage Node (PostgreSQL / Redis)', label: 'Database / Storage Node (PostgreSQL / Redis)' },
              { value: 'Reverse Proxy & Load Balancer', label: 'Reverse Proxy & Load Balancer' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Environment"
            value={environment}
            disabled={isSubmitting}
            onChange={(e) => setEnvironment(e.target.value as ServerEnvironment)}
            options={[
              { value: 'production', label: 'Production' },
              { value: 'staging', label: 'Staging' },
              { value: 'development', label: 'Development' },
              { value: 'dmz', label: 'DMZ (Perimeter)' },
              { value: 'Demo', label: 'Demo' },
            ]}
          />

          <Select
            label="Traffic Source"
            value={trafficSource}
            disabled={isSubmitting}
            onChange={(e) => setTrafficSource(e.target.value as TrafficSourceType)}
            options={[
              { value: 'Flow Telemetry', label: 'Flow Telemetry' },
              { value: 'Optical Diode Tap', label: 'Optical Diode Tap' },
              { value: 'Mirrored Traffic', label: 'Mirrored Traffic (SPAN / TAP)' },
              { value: 'NetFlow', label: 'NetFlow v9' },
              { value: 'IPFIX', label: 'IPFIX Telemetry' },
              { value: 'PCAP', label: 'PCAP File / Buffer' },
              { value: 'Other Authorized Flow Source', label: 'Other Authorized Flow Source' },
            ]}
          />

          <Select
            label="Monitoring Status"
            value={monitoringStatus}
            disabled={isSubmitting}
            onChange={(e) => setMonitoringStatus(e.target.value as 'active' | 'paused')}
            options={[
              { value: 'active', label: 'Active Monitoring' },
              { value: 'paused', label: 'Paused / Standby' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Asset Description
          </label>
          <textarea
            rows={2}
            value={description}
            disabled={isSubmitting}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief notes on asset criticality, network segment, or telemetry feed location..."
            className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sentra-cyan/20 transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            icon={<Shield className="w-4 h-4" />}
          >
            Add Server
          </Button>
        </div>
      </form>
    </Modal>
  );
};
