import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, Server, ShieldAlert, Binary, ArrowRight, X } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const SearchModal: React.FC = () => {
  const { 
    isSearchOpen, 
    setIsSearchOpen, 
    servers, 
    alerts, 
    setSelectedServerId, 
    setSelectedAlertId,
    setActivePage 
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const q = query.trim().toLowerCase();

  // Search Results
  const matchedServers = q
    ? servers.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.ipAddress.includes(q) ||
          s.hostname.toLowerCase().includes(q) ||
          s.serverType.toLowerCase().includes(q)
      )
    : servers.slice(0, 3);

  const matchedAlerts = q
    ? alerts.filter(
        a =>
          a.threat.toLowerCase().includes(q) ||
          a.sourceIp.includes(q) ||
          a.destinationIp.includes(q) ||
          a.serverName.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
      )
    : alerts.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-3 sm:px-4 select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#05070B]/85 backdrop-blur-sm"
        onClick={() => setIsSearchOpen(false)}
      />

      {/* Search Container */}
      <div className="relative w-full max-w-2xl hud-bracket bg-background-surface border border-border-bright rounded shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Top cyan accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sentra-cyan/60 to-transparent" />

        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-background-card">
          <Search className="w-4 h-4 text-sentra-cyan shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search targets, IPs, threat categories, alerts (e.g., '10.0.0.30', 'DDoS', 'Auth')..."
            className="w-full bg-transparent text-xs font-mono text-text placeholder-text-muted/60 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-text-muted hover:text-text p-1 mr-2"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[9px] font-mono px-2 py-0.5 rounded bg-background text-text-muted border border-border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Servers Group */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-sentra-cyan" />
              Monitored Assets ({matchedServers.length})
            </div>
            {matchedServers.length === 0 ? (
              <p className="text-xs font-mono text-text-muted/70 pl-2">No matching servers found</p>
            ) : (
              <div className="space-y-1.5">
                {matchedServers.map((server) => (
                  <div
                    key={server.id}
                    onClick={() => {
                      setSelectedServerId(server.id);
                      setIsSearchOpen(false);
                      setActivePage('servers');
                    }}
                    className="flex items-center justify-between p-2.5 rounded bg-background border border-border hover:border-sentra-cyan/50 hover:bg-background-card cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-background-card border border-border text-sentra-cyan">
                        <Server className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-text group-hover:text-sentra-cyan transition-colors">
                          {server.name}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted flex items-center gap-2">
                          <span>{server.ipAddress}</span>
                          <span>•</span>
                          <span>{server.hostname}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge env={server.environment}>{server.environment}</Badge>
                      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-sentra-cyan group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Threat Alerts Group */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-sentra-danger" />
              Threat Incidents ({matchedAlerts.length})
            </div>
            {matchedAlerts.length === 0 ? (
              <p className="text-xs font-mono text-text-muted/70 pl-2">No matching threat alerts found</p>
            ) : (
              <div className="space-y-1.5">
                {matchedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setSelectedAlertId(alert.id);
                      setIsSearchOpen(false);
                      setActivePage('alerts');
                    }}
                    className="flex items-center justify-between p-2.5 rounded bg-background border border-border hover:border-sentra-danger/50 hover:bg-background-card cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-background-card border border-border text-sentra-danger">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-text group-hover:text-sentra-cyan transition-colors flex items-center gap-2">
                          <span>{alert.threat}</span>
                          <span className="text-[9px] font-mono text-text-muted">{alert.id}</span>
                        </div>
                        <div className="text-[10px] font-mono text-text-muted flex items-center gap-2">
                          <span className="text-sentra-danger">{alert.sourceIp}</span>
                          <span>→</span>
                          <span>{alert.destinationIp}:{alert.destinationPort}</span>
                          <span>({alert.serverName})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge severity={alert.severity}>{alert.severity}</Badge>
                      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-sentra-cyan group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border bg-background-subtle flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span className="flex items-center gap-2">
            <span className="text-sentra-cyan font-bold">INFO:</span> Select target to navigate directly
          </span>
          <span className="tracking-wider">SENTRA TELEMETRY INDEX</span>
        </div>
      </div>
    </div>
  );
};
