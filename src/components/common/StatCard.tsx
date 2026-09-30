import React from 'react';
import { Badge } from './Badge';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'demo';
  icon: React.ReactNode;
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  isDemoPlaceholder?: boolean;
  tooltip?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = 'info',
  icon,
  trendText,
  trendDirection = 'neutral',
  isDemoPlaceholder = false,
  className = '',
}) => {
  return (
    <div
      className={`relative soc-card p-5 bg-background-surface/80 border border-border hover:border-slate-700/80 rounded-xl transition-all duration-200 group ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {title}
            </span>
            {isDemoPlaceholder && (
              <Badge variant="demo">Demo / Mock</Badge>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight pt-1">
            {value}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sentra-cyan group-hover:text-sentra-sky group-hover:border-sentra-cyan/40 transition-colors">
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
        {trendText ? (
          <div className="flex items-center gap-1.5 text-slate-400">
            <span
              className={
                trendDirection === 'up'
                  ? 'text-emerald-400 font-medium'
                  : trendDirection === 'down'
                  ? 'text-rose-400 font-medium'
                  : 'text-slate-400'
              }
            >
              {trendText}
            </span>
          </div>
        ) : (
          <span className="text-slate-500 font-mono text-[11px]">Unidirectional sensor</span>
        )}

        {badgeText && (
          <Badge severity={badgeVariant === 'demo' ? undefined : badgeVariant}>
            {badgeText}
          </Badge>
        )}

        {subtitle && !badgeText && (
          <span className="text-slate-500 text-[11px] truncate max-w-[140px]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
