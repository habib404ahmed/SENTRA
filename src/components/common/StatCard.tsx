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
      className={`relative hud-bracket soc-card p-4.5 bg-background-surface/90 border border-border hover:border-sentra-cyan/40 transition-all duration-200 group overflow-hidden ${className}`}
    >
      {/* Top corner indicator glow on hover */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-sentra-cyan/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
              {title}
            </span>
            {isDemoPlaceholder && (
              <Badge variant="demo" className="text-[9px]">DEMO</Badge>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-text tracking-tight pt-0.5 group-hover:text-sentra-cyan transition-colors">
            {value}
          </div>
        </div>

        <div className="p-2 rounded bg-background-subtle border border-border text-sentra-cyan group-hover:border-sentra-cyan/60 group-hover:shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all">
          {icon}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/70 flex items-center justify-between text-xs relative z-10">
        {trendText ? (
          <div className="flex items-center gap-1.5 text-text-muted font-mono text-[11px]">
            <span
              className={
                trendDirection === 'up'
                  ? 'text-sentra-green font-semibold'
                  : trendDirection === 'down'
                  ? 'text-sentra-danger font-semibold'
                  : 'text-text-muted'
              }
            >
              {trendText}
            </span>
          </div>
        ) : (
          <span className="text-text-muted/70 font-mono text-[10px] uppercase tracking-wider">Unidirectional Sensor</span>
        )}

        {badgeText && (
          <Badge severity={badgeVariant === 'demo' ? undefined : badgeVariant}>
            {badgeText}
          </Badge>
        )}

        {subtitle && !badgeText && (
          <span className="text-text-muted font-mono text-[10px] truncate max-w-[130px]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
