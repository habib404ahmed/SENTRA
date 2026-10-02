import React from 'react';
import { Severity, AlertStatus, ServerEnvironment, TrafficSourceType } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'severity' | 'status' | 'env' | 'source' | 'custom' | 'demo' | 'low' | 'medium' | 'high' | 'critical' | 'info';
  severity?: Severity;
  status?: AlertStatus | 'paused' | 'degraded';
  env?: ServerEnvironment;
  source?: TrafficSourceType;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'custom',
  severity,
  status,
  env,
  className = '',
}) => {
  let styleClasses = 'bg-background-card text-text-muted border-border font-mono text-[11px]';

  if (severity) {
    switch (severity) {
      case 'critical':
        styleClasses = 'bg-sentra-critical/15 text-sentra-critical border-sentra-critical/40 font-bold tracking-wider';
        break;
      case 'high':
        styleClasses = 'bg-sentra-danger/15 text-sentra-danger border-sentra-danger/35 font-semibold';
        break;
      case 'medium':
        styleClasses = 'bg-sentra-amber/15 text-sentra-amber border-sentra-amber/35';
        break;
      case 'low':
        styleClasses = 'bg-sentra-cyan/15 text-sentra-cyan border-sentra-cyan/35';
        break;
      case 'info':
        styleClasses = 'bg-background-card text-text-muted border-border';
        break;
    }
  } else if (variant === 'critical') {
    styleClasses = 'bg-sentra-critical/15 text-sentra-critical border-sentra-critical/40 font-bold';
  } else if (variant === 'high') {
    styleClasses = 'bg-sentra-danger/15 text-sentra-danger border-sentra-danger/35 font-semibold';
  } else if (variant === 'medium') {
    styleClasses = 'bg-sentra-amber/15 text-sentra-amber border-sentra-amber/35';
  } else if (variant === 'low') {
    styleClasses = 'bg-sentra-cyan/15 text-sentra-cyan border-sentra-cyan/35';
  } else if (status) {
    switch (status) {
      case 'new':
        styleClasses = 'bg-sentra-cyan/15 text-sentra-cyan border-sentra-cyan/40 font-bold animate-pulse';
        break;
      case 'acknowledged':
        styleClasses = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35';
        break;
      case 'active':
        styleClasses = 'bg-sentra-green/15 text-sentra-green border-sentra-green/35';
        break;
      case 'investigating':
        styleClasses = 'bg-sentra-amber/15 text-sentra-amber border-sentra-amber/35';
        break;
      case 'resolved':
        styleClasses = 'bg-background-card text-text-subtle border-border';
        break;
      case 'false_positive':
        styleClasses = 'bg-background-card text-text-subtle border-border';
        break;
      case 'paused':
        styleClasses = 'bg-sentra-amber/15 text-sentra-amber border-sentra-amber/30';
        break;
      case 'degraded':
        styleClasses = 'bg-sentra-danger/15 text-sentra-danger border-sentra-danger/35';
        break;
    }
  } else if (env) {
    switch (env) {
      case 'production':
        styleClasses = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
        break;
      case 'staging':
        styleClasses = 'bg-sentra-purple/15 text-sentra-purple border-sentra-purple/30';
        break;
      case 'development':
        styleClasses = 'bg-sentra-green/15 text-sentra-green border-sentra-green/30';
        break;
      case 'dmz':
        styleClasses = 'bg-sentra-danger/15 text-sentra-danger border-sentra-danger/30';
        break;
    }
  } else if (variant === 'demo') {
    styleClasses = 'bg-sentra-cyan/10 text-sentra-cyan border-sentra-cyan/30 text-[10px] tracking-wider uppercase font-mono';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border transition-colors ${styleClasses} ${className}`}
    >
      {children}
    </span>
  );
};
