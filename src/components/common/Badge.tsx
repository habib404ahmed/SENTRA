import React from 'react';
import { Severity, AlertStatus, ServerEnvironment, TrafficSourceType } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'severity' | 'status' | 'env' | 'source' | 'custom' | 'demo';
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
  let styleClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (severity) {
    switch (severity) {
      case 'critical':
        styleClasses = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
        break;
      case 'high':
        styleClasses = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
        break;
      case 'medium':
        styleClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
        break;
      case 'low':
        styleClasses = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
        break;
      case 'info':
        styleClasses = 'bg-slate-500/15 text-slate-300 border-slate-500/30';
        break;
    }
  } else if (status) {
    switch (status) {
      case 'new':
        styleClasses = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
        break;
      case 'acknowledged':
        styleClasses = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
        break;
      case 'active':
        styleClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        break;
      case 'investigating':
        styleClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
        break;
      case 'resolved':
        styleClasses = 'bg-slate-700/40 text-slate-400 border-slate-600/40';
        break;
      case 'false_positive':
        styleClasses = 'bg-slate-800 text-slate-400 border-slate-700';
        break;
      case 'paused':
        styleClasses = 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
        break;
      case 'degraded':
        styleClasses = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
        break;
    }
  } else if (env) {
    switch (env) {
      case 'production':
        styleClasses = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
        break;
      case 'staging':
        styleClasses = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
        break;
      case 'development':
        styleClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
        break;
      case 'dmz':
        styleClasses = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
        break;
    }
  } else if (variant === 'demo') {
    styleClasses = 'bg-sentra-cyan/10 text-sentra-cyan border-sentra-cyan/30 text-[10px] tracking-wider uppercase font-mono';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-colors ${styleClasses} ${className}`}
    >
      {children}
    </span>
  );
};
