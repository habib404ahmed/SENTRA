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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={() => setIsSearchOpen(false)}
      />

      {/* Search Container */}
      <div className="relative w-full max-w-2xl bg-background-surface border border-border rounded-xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-background-card/80">
          <Search className="w-5 h-5 text-sentra-cyan shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search servers, IPs, threat categories, alerts (e.g., '10.0.0.30', 'DDoS', 'Auth')..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-200 p-1 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Servers Group */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-sentra-cyan" />
              Monitored Servers ({matchedServers.length})
            </div>
            {matchedServers.length === 0 ? (
              <p className="text-xs text-slate-500 italic pl-2">No matching servers found</p>
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
                    className="flex items-center justify-between p-2.5 rounded-lg bg-background-card hover:bg-slate-800/80 border border-border/80 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-slate-800 text-sentra-cyan">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-sentra-cyan transition-colors">
                          {server.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                          <span>{server.ipAddress}</span>
                          <span>•</span>
                          <span className="text-slate-500">{server.hostname}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge env={server.environment}>{server.environment}</Badge>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sentra-cyan group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Threat Alerts Group */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Threat Incidents ({matchedAlerts.length})
            </div>
            {matchedAlerts.length === 0 ? (
              <p className="text-xs text-slate-500 italic pl-2">No matching alerts found</p>
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
                    className="flex items-center justify-between p-2.5 rounded-lg bg-background-card hover:bg-slate-800/80 border border-border/80 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-slate-800 text-rose-400">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-sentra-cyan transition-colors flex items-center gap-2">
                          <span>{alert.threat}</span>
                          <span className="text-[10px] font-mono text-slate-500">{alert.id}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                          <span className="text-rose-400/90">{alert.sourceIp}</span>
                          <span>→</span>
                          <span className="text-slate-300">{alert.destinationIp}:{alert.destinationPort}</span>
                          <span>({alert.serverName})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge severity={alert.severity}>{alert.severity}</Badge>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sentra-cyan group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border bg-background-subtle/50 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-2">
            <span className="text-sentra-cyan">Tip:</span> Press Enter to view selection or click to jump directly
          </span>
          <span className="font-mono text-slate-500">SENTRA Global Telemetry Index</span>
        </div>
      </div>
    </div>
  );
};
