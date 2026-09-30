import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Printer, 
  Share2, 
  Layers, 
  ShieldCheck, 
  AlertTriangle,
  Clock,
  FileSpreadsheet
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { showToast, servers, alerts } = useApp();
  const [selectedReportType, setSelectedReportType] = useState('daily');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = (format: 'pdf' | 'csv') => {
    showToast(`Generating and exporting ${format.toUpperCase()} report...`, 'info');
    setTimeout(() => {
      // Create mock file download trigger
      const dummyContent = format === 'csv' 
        ? "Incident_ID,Threat,Severity,Source_IP,Destination,Model_Score,Status\nALT-8921,Reconnaissance,high,203.0.113.42,10.0.0.30,94%,active\nALT-8920,DDoS,critical,198.51.100.88,10.0.0.10,97%,active"
        : "%PDF-1.4 Mock SENTRA Security Summary Report";
      const blob = new Blob([dummyContent], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SENTRA-Security-Report-2026-09-30.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Exported SENTRA report successfully as .${format}`, 'success');
    }, 800);
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      showToast('Daily Security Audit Report generated and compiled.', 'success');
    }, 1000);
  };

  const reportsHistory = [
    {
      id: 'REP-2026-0929',
      title: 'Daily Unidirectional Threat Audit',
      date: '2026-09-29',
      threatsDetected: 31,
      criticalCount: 3,
      status: 'Ready',
      size: '2.4 MB',
    },
    {
      id: 'REP-2026-0928',
      title: 'Monitored Server Health & Flow Balance',
      date: '2026-09-28',
      threatsDetected: 19,
      criticalCount: 1,
      status: 'Ready',
      size: '1.8 MB',
    },
    {
      id: 'REP-2026-0927',
      title: 'DNS Tunneling & Anomaly Special Investigation',
      date: '2026-09-27',
      threatsDetected: 24,
      criticalCount: 4,
      status: 'Ready',
      size: '3.1 MB',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner & Generation Toolbar */}
      <div className="soc-card p-5 bg-background-surface/90 border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 font-display">
                SOC Threat & Telemetry Reporting
              </h2>
              <Badge variant="demo">Audit Ready</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Generate executive compliance summaries, raw incident CSV logs, and technical PDF forensic dossiers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            isLoading={isGenerating}
            icon={<Printer className="w-3.5 h-3.5" />}
            onClick={handleGenerateReport}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards (Daily, Threat, Server, Traffic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Daily Security Summary */}
        <div className="soc-card p-4 bg-background-surface/80 border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Daily Security Summary</span>
              <Calendar className="w-4 h-4 text-sentra-cyan" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-2">
              27 Incidents
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Recorded across all 6 monitored server nodes in 24 hours.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 text-[10px] font-mono text-slate-500">
            Last compiled: 13:00 UTC
          </div>
        </div>

        {/* Card 2: Threat Summary */}
        <div className="soc-card p-4 bg-background-surface/80 border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Threat Breakdown</span>
              <ShieldCheck className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-2">
              4 Critical
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              DDoS SYN flood and DNS tunneling require priority triage.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 text-[10px] font-mono text-slate-500">
            Top vector: DDoS (33%)
          </div>
        </div>

        {/* Card 3: Server Summary */}
        <div className="soc-card p-4 bg-background-surface/80 border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Monitored Assets</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-2">
              {servers.length} Registered
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              5 Production, 1 Staging under passive optical tap monitoring.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 text-[10px] font-mono text-emerald-400">
            100% sensor uptime
          </div>
        </div>

        {/* Card 4: Traffic Summary */}
        <div className="soc-card p-4 bg-background-surface/80 border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Ingress Bandwidth</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-2">
              24.8 GB Total
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Zero frame drops across passive unidirectional mirror interfaces.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 text-[10px] font-mono text-slate-500">
            Average: 1.4 Gbps
          </div>
        </div>
      </div>

      {/* Audit Log / Generated Reports Table */}
      <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-display">
              Generated Reports Archive
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical compliance reports archived for Smart India Hackathon evaluation
            </p>
          </div>
          <Badge variant="demo">SIH-2026 Archive</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                <th className="pb-3 px-3 font-medium">Report Reference</th>
                <th className="pb-3 px-3 font-medium">Report Title</th>
                <th className="pb-3 px-3 font-medium">Generation Date</th>
                <th className="pb-3 px-3 font-medium">Incidents Included</th>
                <th className="pb-3 px-3 font-medium">File Size</th>
                <th className="pb-3 px-3 font-medium">Status</th>
                <th className="pb-3 px-3 text-right font-medium">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {reportsHistory.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-3 font-mono text-sentra-cyan">
                    {rep.id}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-200">
                    {rep.title}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-400">
                    {rep.date}
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-slate-200">{rep.threatsDetected}</span>
                    <span className="text-[10px] text-rose-400 ml-1.5">({rep.criticalCount} crit)</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-400">
                    {rep.size}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {rep.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="p-1.5 rounded text-slate-400 hover:text-sentra-cyan hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-mono">PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
