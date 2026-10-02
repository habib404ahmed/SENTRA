import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Search, 
  Bell, 
  Plus, 
  Activity, 
  ShieldCheck, 
  Clock, 
  Check, 
  Radio, 
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

export const Header: React.FC = () => {
  const { 
    activePage, 
    setIsAddServerOpen, 
    setIsSearchOpen, 
    notifications, 
    unreadNotifsCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    setActivePage,
    setSelectedAlertId,
    serversDiagnostic,
    retryConnection,
    isAutoReconnecting,
    autoReconnectCountdown
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const notifRef = useRef<HTMLDivElement>(null);

  // Live SOC clock (UTC & Local)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Security Operations Center',
      subtitle: 'Passive unidirectional flow telemetry and AI threat detection overview',
    },
    servers: {
      title: 'Monitored Servers',
      subtitle: 'Manage authorized servers and network assets monitored by SENTRA',
    },
    alerts: {
      title: 'Threat Alerts & Incidents',
      subtitle: 'AI-classified network anomalies with unidirectional evidence analysis',
    },
    analytics: {
      title: 'Traffic Analytics',
      subtitle: 'Deep flow telemetry, protocol distribution, and volumetric telemetry',
    },
    intelligence: {
      title: 'Threat Intelligence',
      subtitle: 'Unidirectional behavioral signatures, observed source IPs, and attack patterns',
    },
    reports: {
      title: 'Compliance & Threat Reports',
      subtitle: 'Automated executive security summaries and exportable audit records',
    },
    settings: {
      title: 'Platform Settings',
      subtitle: 'Configure passive sensor thresholds, notification hooks, and diode profiles',
    },
  };

  const currentInfo = pageTitles[activePage] || {
    title: 'SENTRA Console',
    subtitle: 'AI-Based Detection of Cyber Threats in Unidirectional IP Traffic',
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-background-surface/85 backdrop-blur-md border-b border-border px-6 flex items-center justify-between">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-slate-100 font-display">
            {currentInfo.title}
          </h1>
          <span className="text-slate-600 font-mono text-xs">/</span>
          <span className="text-xs font-mono text-sentra-cyan capitalize">
            {activePage}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 hidden md:block">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live SOC Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-border text-slate-300 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-sentra-cyan" />
          <span>{currentTime || '12:00:00 UTC'}</span>
        </div>

        {/* Global Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-card border border-border text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-xs"
          title="Search telemetry (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search telemetry, IPs...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-400">
            Ctrl K
          </kbd>
        </button>

        {/* Unidirectional Sensor Status Tag */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>OPTICAL TAP: 10GbE</span>
        </div>

        {/* Backend & DB Health Indicator Pill */}
        {serversDiagnostic?.backendOnline && serversDiagnostic?.databaseOnline ? (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]" title="FastAPI and PostgreSQL database are online and connected">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>BACKEND: ONLINE</span>
          </div>
        ) : serversDiagnostic?.backendOnline && !serversDiagnostic?.databaseOnline ? (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px]" title="FastAPI is online, but PostgreSQL is reconnecting">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>POSTGRES: CONNECTING</span>
          </div>
        ) : serversDiagnostic && !serversDiagnostic.backendOnline ? (
          <button 
            onClick={() => retryConnection()}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 font-mono text-[11px] transition-colors"
            title="FastAPI backend is offline. Click to diagnose & retry."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>BACKEND: OFFLINE {isAutoReconnecting && autoReconnectCountdown > 0 ? `(${autoReconnectCountdown}s)` : ''}</span>
          </button>
        ) : null}

        {/* Quick Add Server Action */}
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsAddServerOpen(true)}
        >
          <span className="hidden sm:inline">Add Server</span>
        </Button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg bg-background-card border border-border text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-mono font-bold flex items-center justify-center animate-pulse">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-background-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-3.5 border-b border-border bg-background-subtle/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-100">
                    Security Alerts & Events
                  </span>
                  {unreadNotifsCount > 0 && (
                    <Badge variant="demo" className="text-[10px]">
                      {unreadNotifsCount} New
                    </Badge>
                  )}
                </div>
                {unreadNotifsCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] text-sentra-cyan hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationAsRead(n.id);
                        if (n.linkTo) {
                          setActivePage(n.linkTo as any);
                          setIsNotifOpen(false);
                        }
                      }}
                      className={`p-3.5 text-xs cursor-pointer hover:bg-slate-800/40 transition-colors flex items-start gap-3 ${
                        !n.read ? 'bg-sentra-cyan/5' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.severity === 'critical' ? (
                          <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                        ) : n.severity === 'high' ? (
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-sentra-cyan"></div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {n.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-border bg-background-subtle/50 text-center">
                <button
                  onClick={() => {
                    setActivePage('alerts');
                    setIsNotifOpen(false);
                  }}
                  className="text-xs text-sentra-cyan font-medium hover:underline"
                >
                  View All Alerts in Incident Queue →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
