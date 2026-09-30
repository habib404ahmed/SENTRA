import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { 
  mockHourlyTraffic, 
  mockProtocolDistribution, 
  mockTopSourceIps, 
  mockTopPorts 
} from '@/data/mockTraffic';
import { Badge } from '@/components/common/Badge';
import { 
  Activity, 
  Cpu, 
  Layers, 
  ShieldAlert, 
  ArrowUpRight, 
  Radio, 
  Clock, 
  Download,
  Filter
} from 'lucide-react';

export const TrafficAnalyticsDashboard: React.FC = () => {
  const { servers } = useApp();

  const [timeRange, setTimeRange] = useState('24h');
  const [selectedServer, setSelectedServer] = useState('all');
  const [selectedProtocol, setSelectedProtocol] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');

  return (
    <div className="space-y-5">
      {/* Top Banner indicating Simulated Telemetry */}
      <div className="soc-card p-4 bg-background-surface/90 border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                Passive Unidirectional Ingress Stream
              </span>
              <Badge variant="demo">Simulated Telemetry (Demo Mode)</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Flow telemetry captured through physical optical tap without return ACK path
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range */}
          <div className="flex items-center bg-background-card border border-border rounded-lg p-0.5 text-xs font-mono">
            {['1h', '6h', '24h', '7d'].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  timeRange === r ? 'bg-sentra-cyan/20 text-sentra-cyan font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Server dropdown */}
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            className="bg-background-card border border-border text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-sentra-cyan"
          >
            <option value="all">All Monitored Assets</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 4 Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="soc-card p-4 bg-background-surface/80 border border-border rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-400">Total Volume Ingested</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">24.8 GB</div>
          <span className="text-[10px] text-emerald-400 font-mono mt-1 block">+14% vs yesterday</span>
        </div>

        <div className="soc-card p-4 bg-background-surface/80 border border-border rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-400">Peak Packets / Sec</span>
          <div className="text-2xl font-bold font-mono text-sentra-cyan mt-1">9,420 PPS</div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">At 16:00 UTC (E-Comm peak)</span>
        </div>

        <div className="soc-card p-4 bg-background-surface/80 border border-border rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-400">Active Flow Entries</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">638.1K</div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">NetFlow / IPFIX / Mirror</span>
        </div>

        <div className="soc-card p-4 bg-background-surface/80 border border-border rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-400">Anomaly Anomaly Rate</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">0.042%</div>
          <span className="text-[10px] text-rose-400 font-mono mt-1 block">4 active threats flagged</span>
        </div>
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Traffic Volume & Bytes Per Second */}
        <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 font-display">
                Ingress Flow Volume & Throughput
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Volumetric traffic bandwidth (Gbps) over 24-hour observation window
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sentra-cyan border border-slate-700">
              10GbE Tap Interface
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHourlyTraffic}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip contentStyle={{ backgroundColor: '#111723', borderColor: '#1e293b', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="volumeGbps" name="Volume (Gbps)" stroke="#06b6d4" strokeWidth={2} fill="url(#volGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Packets Per Second & Flow Count */}
        <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 font-display">
                Packets Per Second (PPS) & Flow Count
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Packet velocity spikes indicate DDoS or network scan sweeps
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-400 border border-slate-700">
              PPS Telemetry
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockHourlyTraffic}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip contentStyle={{ backgroundColor: '#111723', borderColor: '#1e293b', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="packetsPerSec" name="Packets/Sec" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="flowCount" name="Flow Count" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Protocol & Top Talkers Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Protocol Distribution */}
        <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl">
          <h3 className="text-sm font-semibold text-slate-100 font-display mb-1">
            Protocol Breakdown
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Unidirectional transport layer distribution
          </p>

          <div className="space-y-3">
            {mockProtocolDistribution.map((proto) => (
              <div key={proto.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-200 font-semibold">{proto.name}</span>
                  <span className="text-slate-400">{proto.volume} ({proto.percentage}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${proto.percentage}%`,
                      backgroundColor: proto.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Observed Source IPs */}
        <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl">
          <h3 className="text-sm font-semibold text-slate-100 font-display mb-1">
            Top Observed Source IPs
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            High-volume or anomalous source subnets
          </p>

          <div className="space-y-2.5">
            {mockTopSourceIps.map((src) => (
              <div
                key={src.ip}
                className="p-2.5 rounded-lg bg-background-card border border-border/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono font-semibold text-slate-200">
                    {src.ip}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {src.threat} • {src.packets} pkts
                  </div>
                </div>
                <Badge
                  severity={src.risk === 'Critical' ? 'critical' : src.risk === 'High' ? 'high' : 'medium'}
                >
                  {src.risk}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Top Targeted Destination Ports */}
        <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl">
          <h3 className="text-sm font-semibold text-slate-100 font-display mb-1">
            Target Destination Ports
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Services monitored across protected network assets
          </p>

          <div className="space-y-2.5">
            {mockTopPorts.map((port) => (
              <div
                key={port.port}
                className="p-2.5 rounded-lg bg-background-card border border-border/80 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 text-sentra-cyan font-bold">
                    :{port.port}
                  </span>
                  <div>
                    <span className="text-slate-200 font-sans block text-[11px] font-medium">
                      {port.service}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {port.flows} flows ({port.trafficPercent}%)
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    port.status === 'Anomalous'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : port.status === 'Suspicious'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {port.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
