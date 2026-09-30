import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { mockThreatDistribution } from '@/data/mockTraffic';

export const ThreatDistributionChart: React.FC = () => {
  const totalThreats = mockThreatDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="soc-card p-5 bg-background-surface/80 border border-border rounded-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100 font-display">
            Threat Distribution
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            Total: {totalThreats}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Breakdown of classified threat signatures
        </p>
      </div>

      <div className="relative h-44 w-full my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mockThreatDistribution}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="count"
            >
              {mockThreatDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#111723" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#111723',
                borderColor: '#1e293b',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              formatter={(value: any, name: any, item: any) => [
                `${value} alerts (${item.payload.percentage}%)`,
                item.payload.category,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-slate-100">{totalThreats}</span>
          <span className="text-[9px] uppercase font-mono text-slate-400">Alerts</span>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-border/60 text-xs">
        {mockThreatDistribution.map((item) => (
          <div key={item.category} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300 truncate max-w-[95px]">{item.category}</span>
            </div>
            <span className="font-mono text-slate-400 shrink-0">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
