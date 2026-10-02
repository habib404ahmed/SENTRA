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
    <header className="sticky top-0 z-20 h-14 bg-background-subtle/95 backdrop-blur-md border-b border-border px-4 sm:px-6 flex items-center justify-between select-none">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xs sm:text-sm font-bold text-text uppercase tracking-widest font-mono">
            {currentInfo.title}
          </h1>
          <span className="text-border-bright font-mono text-xs">//</span>
          <span className="text-[11px] font-mono font-bold text-sentra-cyan uppercase tracking-wider">
            {activePage}
          </span>
        </div>
        <p className="text-[10px] font-mono text-text-muted hidden md:block tracking-tight">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Live SOC Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-border text-text-muted font-mono text-[11px] shadow-inner">
          <Clock className="w-3.5 h-3.5 text-sentra-cyan" />
          <span className="text-text font-semibold">{currentTime || '00:00:00 UTC'}</span>
        </div>

        {/* Global Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-background-card border border-border text-text-muted hover:text-text hover:border-border-bright hover:shadow-[0_0_8px_rgba(37,50,68,0.5)] transition-all text-xs font-mono"
          title="Search telemetry (Ctrl+K)"
          aria-label="Search telemetry"
        >
          <Search className="w-3.5 h-3.5 text-sentra-cyan" />
          <span className="hidden sm:inline text-[11px]">TELEMETRY SEARCH</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono bg-background border border-border rounded text-text-muted">
            CTRL K
          </kbd>
        </button>

        {/* Unidirectional Sensor Status Tag */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-sentra-green/30 text-sentra-green font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-sentra-green animate-pulse"></span>
          <span>OPTICAL TAP: 10GbE</span>
        </div>

        {/* Backend & DB Health Indicator Pill */}
        {serversDiagnostic?.backendOnline && serversDiagnostic?.healthRouteValid && serversDiagnostic?.databaseOnline ? (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-sentra-green/30 text-sentra-green font-mono text-[10px]" title="FastAPI and PostgreSQL database are online and connected">
            <span className="w-1.5 h-1.5 rounded-full bg-sentra-green animate-pulse"></span>
            <span>API: ONLINE</span>
          </div>
        ) : serversDiagnostic?.backendOnline && serversDiagnostic?.healthRouteValid && !serversDiagnostic?.databaseOnline ? (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-sentra-amber/30 text-sentra-amber font-mono text-[10px]" title="FastAPI is online, but PostgreSQL is reconnecting">
            <span className="w-1.5 h-1.5 rounded-full bg-sentra-amber animate-pulse"></span>
            <span>DB: CONNECTING</span>
          </div>
        ) : serversDiagnostic?.backendOnline && !serversDiagnostic?.healthRouteValid ? (
          <button 
            onClick={() => retryConnection()}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-sentra-amber/30 text-sentra-amber hover:bg-sentra-amber/10 font-mono text-[10px] transition-colors"
            title="Backend is reachable, but the health route returned HTTP 404. Click to diagnose & retry."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sentra-amber"></span>
            <span>ROUTE 404 {isAutoReconnecting && autoReconnectCountdown > 0 ? `(${autoReconnectCountdown}s)` : ''}</span>
          </button>
        ) : serversDiagnostic && !serversDiagnostic.backendOnline ? (
          <button 
            onClick={() => retryConnection()}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-sentra-danger/40 text-sentra-danger hover:bg-sentra-danger/10 font-mono text-[10px] transition-colors"
            title="FastAPI backend is offline or unreachable. Click to diagnose & retry."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sentra-danger animate-pulse"></span>
            <span>API: OFFLINE {isAutoReconnecting && autoReconnectCountdown > 0 ? `(${autoReconnectCountdown}s)` : ''}</span>
          </button>
        ) : null}

        {/* Quick Add Server Action */}
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          onClick={() => {
            setActivePage('servers');
            setIsAddServerOpen(true);
          }}
          aria-label="Add Server"
          title="Register a new monitored server"
          data-testid="global-add-server-btn"
        >
          <span className="hidden sm:inline">Add Server</span>
        </Button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded bg-background-card border border-border text-text-muted hover:text-text hover:border-border-bright hover:shadow-[0_0_8px_rgba(37,50,68,0.5)] transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-sentra-danger text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center animate-pulse">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-background-surface border border-border-bright rounded shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-3 border-b border-border bg-background-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-text">
                    Threat & System Logs
                  </span>
                  {unreadNotifsCount > 0 && (
                    <Badge variant="demo" className="text-[9px]">
                      {unreadNotifsCount} NEW
                    </Badge>
                  )}
                </div>
                {unreadNotifsCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-[10px] font-mono text-sentra-cyan hover:underline flex items-center gap-1 uppercase"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/60 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono text-text-muted">
                    No active incident notifications
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
                      className={`p-3 text-xs cursor-pointer hover:bg-background-card/60 transition-colors flex items-start gap-2.5 ${
                        !n.read ? 'bg-sentra-cyan/5' : ''
                      }`}
                    >
                      <div className="mt-1 shrink-0">
                        {n.severity === 'critical' ? (
                          <div className="w-2 h-2 rounded-full bg-sentra-critical animate-ping" />
                        ) : n.severity === 'high' ? (
                          <div className="w-2 h-2 rounded-full bg-sentra-danger" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-sentra-cyan" />
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-text text-xs">
                            {n.title}
                          </span>
                          <span className="text-[9px] text-text-muted font-mono">
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-tight font-sans">
                          {n.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-border bg-background-subtle text-center">
                <button
                  onClick={() => {
                    setActivePage('alerts');
                    setIsNotifOpen(false);
                  }}
                  className="text-xs font-mono uppercase tracking-wider text-sentra-cyan font-medium hover:underline"
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
