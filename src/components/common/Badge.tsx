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
  let styleClasses = 'bg-slate-900 text-slate-300 border-border font-mono text-[11px]';

  if (severity) {
    switch (severity) {
      case 'critical':
        styleClasses = 'bg-[#FF003C]/15 text-[#FF003C] border-[#FF003C]/40 shadow-glow-critical/20 font-bold tracking-wider';
        break;
      case 'high':
        styleClasses = 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/35 font-semibold';
        break;
      case 'medium':
        styleClasses = 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/35';
        break;
      case 'low':
        styleClasses = 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/35';
        break;
      case 'info':
        styleClasses = 'bg-slate-800/80 text-slate-300 border-border';
        break;
    }
  } else if (variant === 'critical') {
    styleClasses = 'bg-[#FF003C]/15 text-[#FF003C] border-[#FF003C]/40 font-bold';
  } else if (variant === 'high') {
    styleClasses = 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/35 font-semibold';
  } else if (variant === 'medium') {
    styleClasses = 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/35';
  } else if (variant === 'low') {
    styleClasses = 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/35';
  } else if (status) {
    switch (status) {
      case 'new':
        styleClasses = 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/40 font-bold animate-pulse';
        break;
      case 'acknowledged':
        styleClasses = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35';
        break;
      case 'active':
        styleClasses = 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/35';
        break;
      case 'investigating':
        styleClasses = 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/35';
        break;
      case 'resolved':
        styleClasses = 'bg-slate-800/60 text-slate-400 border-slate-700/60';
        break;
      case 'false_positive':
        styleClasses = 'bg-slate-900 text-slate-500 border-border';
        break;
      case 'paused':
        styleClasses = 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/30';
        break;
      case 'degraded':
        styleClasses = 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/35';
        break;
    }
  } else if (env) {
    switch (env) {
      case 'production':
        styleClasses = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
        break;
      case 'staging':
        styleClasses = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
        break;
      case 'development':
        styleClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
        break;
      case 'dmz':
        styleClasses = 'bg-[#FF1744]/15 text-[#FF1744] border-[#FF1744]/30';
        break;
    }
  } else if (variant === 'demo') {
    styleClasses = 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30 text-[10px] tracking-wider uppercase font-mono';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border transition-colors ${styleClasses} ${className}`}
    >
      {children}
    </span>
  );
};
