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
    <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 font-display">
              Threat Activity Timeline
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Unidirectional Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingress volumetric flow (Gbps) correlated with AI-classified anomalous threat events
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sentra-cyan"></span>
            <span className="text-slate-300">Flow Volume (Gbps)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span className="text-slate-300">Threat Events</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockHourlyTraffic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="threatsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false}
              fontFamily="JetBrains Mono"
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false}
              fontFamily="JetBrains Mono"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111723',
                borderColor: '#1e293b',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
              labelStyle={{ color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
            />
            <Area
              type="monotone"
              dataKey="volumeGbps"
              name="Flow Volume (Gbps)"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#volumeGradient)"
            />
            <Area
              type="monotone"
              dataKey="threatEvents"
              name="Threat Events"
              stroke="#f43f5e"
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
