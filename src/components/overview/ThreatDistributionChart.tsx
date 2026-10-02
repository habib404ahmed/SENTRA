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

  // Tactical palette colors for categories
  const categoryPalette = ['#00E5FF', '#FF1744', '#FFB300', '#9C27B0', '#00E676'];

  return (
    <div className="hud-bracket soc-card p-4.5 bg-background-surface/90 border border-border flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text">
            Threat Signatures
          </h3>
          <span className="text-[10px] font-mono text-sentra-cyan bg-background px-1.5 py-0.5 rounded border border-border">
            TOTAL: {totalThreats}
          </span>
        </div>
        <p className="text-[11px] font-mono text-text-muted mt-0.5">
          Distribution across active attack vectors
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
                <Cell 
                  key={`cell-${index}`} 
                  fill={categoryPalette[index % categoryPalette.length]} 
                  stroke="#05070B" 
                  strokeWidth={2} 
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#101722',
                borderColor: '#253244',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#EAF2FF',
              }}
              formatter={(value: any, name: any, item: any) => [
                `${value} alerts (${item.payload.percentage}%)`,
                item.payload.category,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-text">{totalThreats}</span>
          <span className="text-[9px] uppercase font-mono tracking-widest text-text-muted">SIGNALS</span>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-border text-xs">
        {mockThreatDistribution.map((item, index) => (
          <div key={item.category} className="flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }}
              />
              <span className="text-text-muted truncate max-w-[95px]">{item.category}</span>
            </div>
            <span className="text-text font-bold shrink-0">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
