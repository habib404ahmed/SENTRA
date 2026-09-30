import React, { useState } from 'react';
import { mockThreatCategoriesIntel, mockObservedIps } from '@/data/mockThreats';
import { Badge } from '@/components/common/Badge';
import { 
  Binary, 
  ShieldAlert, 
  Eye, 
  Search, 
  HelpCircle, 
  Network, 
  Lock, 
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ThreatIntelItem } from '@/types';

export const ThreatIntelligenceView: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string>('DDoS');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = mockThreatCategoriesIntel.filter(
    (c) =>
      c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.keyIndicators.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Overview Banner */}
      <div className="soc-card p-5 bg-background-surface/90 border border-border rounded-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-lg bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30 shrink-0">
            <Binary className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 font-display">
                Unidirectional Threat Intelligence & Behavioral Taxonomy
              </h2>
              <Badge variant="demo">Knowledge Base & Heuristics</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
              SENTRA detects cyber threats passively across unidirectional IP traffic. Because unidirectional taps and data diodes provide no reverse ACK packets, threat identification relies strictly on forward flow statistical properties, behavioral inter-arrival intervals, entropy scores, and supervised anomaly classification.
            </p>
          </div>
        </div>

        {/* Notice on Terminology & Evidence */}
        <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-border text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Analytical Standard:</strong> SENTRA characterizes <em>observed traffic patterns</em> and generates <em>model confidence scores</em>. Telemetry indicators do not claim deterministic real-world attacker attribution without secondary forensic confirmation.
          </span>
        </div>
      </div>

      {/* 6 Core Threat Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-sentra-cyan" />
            Classified Threat Signatures ({mockThreatCategoriesIntel.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Optimized for Ingress Only Networks
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredCategories.map((cat) => {
            const isExpanded = expandedCategory === cat.category;
            return (
              <div
                key={cat.category}
                className="soc-card bg-background-surface/80 border border-border rounded-xl overflow-hidden transition-all"
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedCategory(isExpanded ? '' : cat.category)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-slate-800 text-sentra-cyan">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">
                          {cat.category}
                        </span>
                        <Badge severity={cat.riskLevel}>{cat.riskLevel}</Badge>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {cat.observedCount} Incidents Observed
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {cat.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-xs hidden sm:inline font-mono">
                      {isExpanded ? 'Collapse' : 'Inspect Indicators'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 border-t border-border/80 bg-background-subtle/40 space-y-4 text-xs animate-in fade-in duration-150">
                    <div>
                      <span className="font-semibold text-slate-200 block mb-1">
                        Behavioral Description:
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-sentra-cyan/5 border border-sentra-cyan/20">
                      <span className="font-semibold text-sentra-cyan block mb-1 font-mono text-[11px] uppercase tracking-wider">
                        Unidirectional IP Traffic Detection Mechanism:
                      </span>
                      <p className="text-slate-300 leading-relaxed font-sans">
                        {cat.unidirectionalDetectionMechanism}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Key Indicators */}
                      <div>
                        <span className="font-semibold text-slate-200 block mb-2 font-mono text-[11px]">
                          Key Telemetry Clues & Feature Signatures:
                        </span>
                        <ul className="space-y-1.5 text-slate-300">
                          {cat.keyIndicators.map((ind, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                              <span>{ind}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Ports & Associated Protocols */}
                      <div className="space-y-3">
                        <div>
                          <span className="font-semibold text-slate-200 block mb-1.5 font-mono text-[11px]">
                            Common Target Ports:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.commonPorts.map((p) => (
                              <span
                                key={p}
                                className="px-2 py-0.5 rounded bg-slate-800 text-sentra-cyan font-mono text-[11px] border border-border"
                              >
                                :{p}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-200 block mb-1.5 font-mono text-[11px]">
                            Associated Protocols:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.associatedProtocols.map((proto) => (
                              <span
                                key={proto}
                                className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-mono text-[11px] border border-border"
                              >
                                {proto}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Observed Source IPs Tracker */}
      <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-display flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              Observed Source IP Telemetry Tracker
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Source addresses observed initiating abnormal ingress flows across protected network segments
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Passive Flow Index
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                <th className="pb-3 px-3 font-medium">Observed Source IP</th>
                <th className="pb-3 px-3 font-medium">Subnet / Autonomous System</th>
                <th className="pb-3 px-3 font-medium">Anomaly Score</th>
                <th className="pb-3 px-3 font-medium">Associated Threat Category</th>
                <th className="pb-3 px-3 font-medium">Packets Ingested</th>
                <th className="pb-3 px-3 font-medium">First / Last Seen</th>
                <th className="pb-3 px-3 font-medium">Watchlist Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {mockObservedIps.map((ip) => (
                <tr key={ip.ip} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-rose-300">
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-border">
                      {ip.ip}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <div>{ip.organization}</div>
                    <span className="text-[10px] font-mono text-slate-500">{ip.country}</span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span className={`font-semibold ${ip.threatScore >= 90 ? 'text-rose-400' : 'text-amber-400'}`}>
                      {ip.threatScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {ip.associatedThreats.join(', ')}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {ip.packetCount}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    <div>{ip.lastSeen}</div>
                    <span className="text-[10px] text-slate-500">First: {ip.firstSeen}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono border ${
                        ip.status === 'Flagged'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : ip.status === 'Under Review'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      }`}
                    >
                      {ip.status}
                    </span>
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
