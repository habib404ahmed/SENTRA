import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Tabs } from '@/components/common/Tabs';
import { 
  Settings, 
  ShieldCheck, 
  Sliders, 
  Bell, 
  Palette, 
  Lock, 
  Radio, 
  Cpu, 
  CheckCircle2, 
  Save,
  HelpCircle,
  AlertTriangle,
  Server,
  Globe,
  RefreshCw
} from 'lucide-react';
import { API_BASE_URL, getCustomApiBaseUrl, setCustomApiBaseUrl } from '@/config/api';
import { checkSystemDiagnostics, ConnectionDiagnosticResult } from '@/services/servers';

export const SettingsView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState('monitoring');

  // Form states
  const [passiveMode, setPassiveMode] = useState(true);
  const [readOnlyDiode, setReadOnlyDiode] = useState(true);
  const [detectionThreshold, setDetectionThreshold] = useState(85);
  const [anomalySensitivity, setAnomalySensitivity] = useState('standard');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);

  const [customApiUrl, setCustomApiUrl] = useState(() => getCustomApiBaseUrl() || API_BASE_URL || '');
  const [diagResult, setDiagResult] = useState<ConnectionDiagnosticResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleSaveApiUrl = () => {
    if (customApiUrl.trim()) {
      setCustomApiBaseUrl(customApiUrl.trim());
      showToast(`Custom API base URL saved: ${customApiUrl.trim()}. Reloading connection...`, 'success');
      setTimeout(() => window.location.reload(), 800);
    } else {
      setCustomApiBaseUrl(null);
      showToast('Custom API URL cleared. Reverting to default configuration.', 'info');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const handleTestConnection = async () => {
    setIsDiagnosing(true);
    showToast('Running live diagnostic probe against API...', 'info');
    try {
      const res = await checkSystemDiagnostics();
      setDiagResult(res);
      if (res.backendOnline && res.databaseOnline) {
        showToast('All systems operational: FastAPI and PostgreSQL connected!', 'success');
      } else {
        showToast(`Diagnostic check: ${res.statusMessage}`, 'error');
      }
    } catch (err: any) {
      showToast(`Diagnostic failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleSave = (section: string) => {
    showToast(`${section} settings saved successfully.`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="soc-card p-5 bg-background-surface/90 border border-border rounded-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-lg bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 font-display">
                SENTRA Console & Sensor Settings
              </h2>
              <Badge variant="demo">Phase 1 Configurator</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Configure unidirectional ingestion parameters, model inference sensitivity thresholds, and SOC alerting webhooks. Future ML pipeline parameters are clearly marked as placeholders.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'backend', label: 'Cloud API & Backend', icon: <Server className="w-3.5 h-3.5" /> },
          { id: 'monitoring', label: 'Unidirectional Monitoring', icon: <Lock className="w-3.5 h-3.5" /> },
          { id: 'detection', label: 'Detection & ML Pipeline', icon: <Sliders className="w-3.5 h-3.5" /> },
          { id: 'notifications', label: 'Notifications & Dispatch', icon: <Bell className="w-3.5 h-3.5" /> },
          { id: 'general', label: 'General & Access Control', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          { id: 'appearance', label: 'Appearance & SOC Display', icon: <Palette className="w-3.5 h-3.5" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 0: Cloud API & Backend */}
      {activeTab === 'backend' && (
        <div className="soc-card p-6 bg-background-surface/80 border border-border rounded-xl space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
              <Globe className="w-4 h-4 text-sentra-cyan" />
              FastAPI Threat Defense Backend & Database Integration
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect this frontend SOC console to your deployed FastAPI backend web service or local development instance.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-background-card border border-border space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                Backend API Base URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://sentra-backend.onrender.com (or http://localhost:8000)"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  className="flex-1 bg-background border border-border focus:border-sentra-cyan rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveApiUrl}
                  icon={<Save className="w-3.5 h-3.5" />}
                >
                  Save URL
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isDiagnosing}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />}
                >
                  {isDiagnosing ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Currently Active Endpoint Origin: <strong className="text-sentra-cyan">{API_BASE_URL || '(Same-Origin Relative /api)'}</strong>
              </p>
            </div>

            {diagResult && (
              <div className={`p-3.5 rounded-lg border font-mono text-xs ${
                diagResult.backendOnline && diagResult.databaseOnline 
                  ? 'bg-sentra-green/10 border-sentra-green/30 text-sentra-green'
                  : 'bg-sentra-danger/10 border-sentra-danger/30 text-sentra-danger'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  <span>STATUS: {diagResult.backendOnline && diagResult.databaseOnline ? 'ONLINE & HEALTHY' : 'CONNECTIVITY ISSUE'}</span>
                </div>
                <div className="text-[11px] space-y-0.5 opacity-90">
                  <p>• FastAPI Service Liveness: {diagResult.backendOnline ? 'Online (200 OK)' : 'Offline / Unreachable'}</p>
                  <p>• /api/health Route: {diagResult.healthRouteValid ? 'Valid' : 'Invalid / 404'}</p>
                  <p>• PostgreSQL Database: {diagResult.databaseOnline ? 'Connected' : 'Disconnected / Unavailable'}</p>
                  <p>• Diagnostic Message: {diagResult.statusMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Unidirectional Monitoring */}
      {activeTab === 'monitoring' && (
        <div className="soc-card p-6 bg-background-surface/80 border border-border rounded-xl space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Passive Sensor & Diode Enforcement
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict hardware and software boundaries guaranteeing zero reverse-path network emissions.
            </p>
          </div>

          <div className="space-y-4">
            {/* Toggle 1 */}
            <div className="p-4 rounded-xl bg-background-card border border-border flex items-center justify-between">
              <div className="space-y-0.5 max-w-xl">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Enforce Passive Read-Only Ingestion Mode</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Disables raw socket transmit capabilities (AF_PACKET TX disabled). Sensor operates solely as a non-intrusive flow listener.
                </p>
              </div>
              <input
                type="checkbox"
                checked={passiveMode}
                onChange={(e) => setPassiveMode(e.target.checked)}
                className="w-4 h-4 rounded text-sentra-cyan bg-slate-900 border-border focus:ring-sentra-cyan"
              />
            </div>

            {/* Toggle 2 */}
            <div className="p-4 rounded-xl bg-background-card border border-border flex items-center justify-between">
              <div className="space-y-0.5 max-w-xl">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Optical Data Diode Link Verification</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
                    Hardware Locked
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Photodiode physical simplex fiber link. Asserts that transmitting lasers are disconnected at the physical layer.
                </p>
              </div>
              <input
                type="checkbox"
                checked={readOnlyDiode}
                onChange={(e) => setReadOnlyDiode(e.target.checked)}
                className="w-4 h-4 rounded text-sentra-cyan bg-slate-900 border-border focus:ring-sentra-cyan"
              />
            </div>

            {/* Ingestion Buffer Size */}
            <div className="p-4 rounded-xl bg-background-card border border-border space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Ring Buffer Allocation (Per 10GbE Tap Interface):
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-sentra-cyan/40 text-xs">
                  <span className="font-mono text-sentra-cyan font-bold block">4,096 MB (Default)</span>
                  <span className="text-[11px] text-slate-400">Zero-loss burst threshold at line rate</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-border text-xs opacity-60">
                  <span className="font-mono text-slate-300 font-bold block">2,048 MB</span>
                  <span className="text-[11px] text-slate-400">Low-memory appliance profile</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-border text-xs opacity-60">
                  <span className="font-mono text-slate-300 font-bold block">8,192 MB</span>
                  <span className="text-[11px] text-slate-400">Ultra-high density carrier profile</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={() => handleSave('Monitoring & Diode')}
            >
              Save Monitoring Settings
            </Button>
          </div>
        </div>
      )}

      {/* Tab 2: Detection & ML Pipeline */}
      {activeTab === 'detection' && (
        <div className="soc-card p-6 bg-background-surface/80 border border-border rounded-xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                AI Inference Engine & Anomaly Thresholds
              </h3>
              <Badge variant="demo">Phase 2 Backend Roadmap Placeholder</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              These parameters configure the upcoming Phase 2 XGBoost / Isolation Forest ML model inference pipeline.
            </p>
          </div>

          <div className="space-y-4">
            {/* Slider: Threshold */}
            <div className="p-4 rounded-xl bg-background-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Model Confidence Alert Threshold
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Incidents scoring above this threshold trigger real-time SOC incident escalation.
                  </p>
                </div>
                <span className="text-lg font-bold font-mono text-sentra-cyan bg-slate-900 px-2.5 py-1 rounded border border-border">
                  {detectionThreshold}%
                </span>
              </div>

              <input
                type="range"
                min="50"
                max="99"
                value={detectionThreshold}
                onChange={(e) => setDetectionThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sentra-cyan"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>50% (High Sensitivity / False Positives)</span>
                <span>85% (Recommended Balanced)</span>
                <span>99% (Strict High Confidence Only)</span>
              </div>
            </div>

            {/* Model Architecture Selection (Placeholder) */}
            <div className="p-4 rounded-xl bg-background-card border border-border space-y-3">
              <span className="text-xs font-semibold text-slate-200 block">
                Primary Supervised Classifier Architecture (Phase 2 Roadmap)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-100 font-mono">XGBoost Ensemble</span>
                    <Badge variant="demo">Planned</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Gradient boosted decision trees optimized for unidirectional tabular flow features.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-border opacity-70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-300 font-mono">Isolation Forest</span>
                    <Badge variant="demo">Planned</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Unsupervised anomaly detection for zero-day exfiltration patterns.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-border opacity-70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-300 font-mono">Temporal LSTM</span>
                    <Badge variant="demo">Research</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Recurrent sequential modeling for slow-beacon C2 detection.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={() => handleSave('Detection Pipeline')}
            >
              Apply Detection Thresholds
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Notifications */}
      {activeTab === 'notifications' && (
        <div className="soc-card p-6 bg-background-surface/80 border border-border rounded-xl space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              SOC Notification Channels & Webhooks
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dispatch incident escalations to security engineers.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-background-card border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Email Dispatch to Incident Responders
                </span>
                <span className="text-[11px] text-slate-400">
                  Sends formatted threat summaries to habib@sentra.sec
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-sentra-cyan bg-slate-900 border-border focus:ring-sentra-cyan"
              />
            </div>

            <div className="p-4 rounded-xl bg-background-card border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Filter: Escalate Critical Priority Incidents Only
                </span>
                <span className="text-[11px] text-slate-400">
                  Suppresses Medium/Low severity alerts from external paging.
                </span>
              </div>
              <input
                type="checkbox"
                checked={criticalOnly}
                onChange={(e) => setCriticalOnly(e.target.checked)}
                className="w-4 h-4 rounded text-sentra-cyan bg-slate-900 border-border focus:ring-sentra-cyan"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={() => handleSave('Notification Channels')}
            >
              Save Notification Preferences
            </Button>
          </div>
        </div>
      )}

      {/* Tab 4: General */}
      {activeTab === 'general' && (
        <div className="soc-card p-6 bg-background-surface/80 border border-border rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-100 font-display">
            Smart India Hackathon 2026 Project Metadata
          </h3>
          <div className="p-4 rounded-xl bg-background-card border border-border space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-slate-400">Problem Statement ID:</span>
              <span className="text-sentra-cyan font-bold">26145</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-slate-400">Official Problem Statement:</span>
              <span className="text-slate-200">AI-Based Detection of Cyber Threats in Unidirectional IP Traffic</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-slate-400">Team Name:</span>
              <span className="text-slate-200">Sentra 1</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-slate-400">Team ID:</span>
              <span className="text-slate-200">191970</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-slate-400">Theme:</span>
              <span className="text-slate-200">Blockchain & Cybersecurity</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Current Phase:</span>
              <span className="text-emerald-400 font-bold">Phase 1 (Complete UI/UX Prototype)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Appearance */}
      {activeTab === 'appearance' && (
        <div className="soc-card p-6 bg-background-surface/80 border border-border rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-100 font-display">
            SOC Console Theme & Display Mode
          </h3>
          <p className="text-xs text-slate-400">
            SENTRA operates in Dark-First High Contrast mode optimized for Security Operations Centers (SOC) 24/7 monitoring environments.
          </p>
          <div className="p-4 rounded-xl bg-background-card border border-sentra-cyan/40 text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-100 block">Dark SOC Palette (Active)</span>
              <span className="text-slate-400">#080b11 deep background with cyan & rose threat highlights</span>
            </div>
            <Badge status="active">Active</Badge>
          </div>
        </div>
      )}
    </div>
  );
};
