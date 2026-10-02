import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { mockHourlyTraffic } from '@/data/mockTraffic';

export const ThreatTimelineChart: React.FC = () => {
  return (
    <div className="hud-bracket soc-card p-4.5 bg-background-surface/90 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text">
              Threat Activity Timeline
            </h3>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-background border border-border text-sentra-cyan">
              TELEMETRY STREAM
            </span>
          </div>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">
            Ingress volumetric flow (Gbps) correlated with AI-classified threat spikes
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sentra-cyan shadow-[0_0_6px_#00E5FF]"></span>
            <span className="text-text-muted text-[11px]">Flow (Gbps)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sentra-danger shadow-[0_0_6px_#FF1744]"></span>
            <span className="text-text-muted text-[11px]">Threat Events</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockHourlyTraffic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="threatsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF1744" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#FF1744" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2333" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              stroke="#8193AA" 
              fontSize={10} 
              tickLine={false}
              fontFamily="JetBrains Mono, monospace"
            />
            <YAxis 
              stroke="#8193AA" 
              fontSize={10} 
              tickLine={false}
              fontFamily="JetBrains Mono, monospace"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#101722',
                borderColor: '#253244',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
                color: '#EAF2FF'
              }}
              labelStyle={{ color: '#8193AA', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}
            />
            <Area
              type="monotone"
              dataKey="volumeGbps"
              name="Flow Volume (Gbps)"
              stroke="#00E5FF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#volumeGradient)"
            />
            <Area
              type="monotone"
              dataKey="threatEvents"
              name="Threat Events"
              stroke="#FF1744"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#threatsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
