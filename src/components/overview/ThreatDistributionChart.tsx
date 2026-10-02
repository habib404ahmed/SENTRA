import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { ShieldCheck, Activity } from 'lucide-react';

export interface ThreatDistributionItem {
  category: string;
  count: number;
  percentage: number;
  color?: string;
}

interface ThreatDistributionChartProps {
  data?: ThreatDistributionItem[];
  isLoading?: boolean;
}

export const ThreatDistributionChart: React.FC<ThreatDistributionChartProps> = ({ 
  data = [], 
  isLoading = false 
}) => {
  const totalThreats = data.reduce((acc, curr) => acc + curr.count, 0);
  const hasData = data && data.length > 0 && totalThreats > 0;

  // Tactical palette colors for categories
  const defaultColors = ['#00E5FF', '#FF1744', '#FFB300', '#9C27B0', '#00E676', '#3B82F6', '#EC4899'];

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
        {isLoading ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 font-mono text-xs text-text-muted">
            <Activity className="w-5 h-5 text-sentra-cyan animate-spin" />
            <span>AGGREGATING SIGNATURES...</span>
          </div>
        ) : !hasData ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 border border-dashed border-border/70 rounded bg-background/30 p-4 text-center font-mono">
            <div className="p-2 rounded-full bg-sentra-green/10 border border-sentra-green/30 text-sentra-green">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-text">
              NO THREAT SIGNALS
            </span>
            <span className="text-[10px] text-text-muted max-w-[200px]">
              Zero attack signatures recorded in the database.
            </span>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || defaultColors[index % defaultColors.length]} 
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
          </>
        )}
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-border text-xs min-h-[48px]">
        {!hasData ? (
          <div className="col-span-2 text-center text-[10px] font-mono text-text-muted/60 py-2">
            STANDBY // INGRESS NOMINAL
          </div>
        ) : (
          data.map((item, index) => (
            <div key={item.category} className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color || defaultColors[index % defaultColors.length] }}
                />
                <span className="text-text-muted truncate max-w-[95px]">{item.category}</span>
              </div>
              <span className="text-text font-bold shrink-0">{item.percentage}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
