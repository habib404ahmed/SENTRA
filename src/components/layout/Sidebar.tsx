import React, { useState } from 'react';
import { useApp, PageId } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  Server, 
  ShieldAlert, 
  LineChart, 
  Binary, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  Radio, 
  Lock,
  LogOut,
  ExternalLink,
  UploadCloud,
  Sliders
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activePage, 
    setActivePage, 
    alerts, 
    servers, 
    currentUser, 
    logout 
  } = useApp();
  
  const [collapsed, setCollapsed] = useState(false);

  const activeAlertsCount = alerts.filter(a => a.status === 'active').length;
  const activeServersCount = servers.length;

  const navItems: {
    id: PageId;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'servers',
      label: 'Monitored Servers',
      icon: <Server className="w-4 h-4" />,
      badge: activeServersCount,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      id: 'ingestion',
      label: 'Traffic Ingestion',
      icon: <UploadCloud className="w-4 h-4" />,
      badge: 'PCAP',
      badgeColor: 'bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30',
    },
    {
      id: 'features',
      label: 'Feature Engineering',
      icon: <Sliders className="w-4 h-4" />,
      badge: 'ML Prep',
      badgeColor: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    },
    {
      id: 'alerts',
      label: 'Threat Alerts',
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    },
    {
      id: 'analytics',
      label: 'Traffic Analytics',
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      id: 'intelligence',
      label: 'Threat Intelligence',
      icon: <Binary className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 flex flex-col justify-between bg-background-surface border-r border-border transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-background-subtle/40">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sentra-cyan to-blue-600 flex items-center justify-center shadow-glow-cyan shrink-0">
                <Shield className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-extrabold tracking-wider text-base text-white">
                    SENTRA
                  </span>
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30">
                    SOC
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  Unidirectional Threat Detection
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-br from-sentra-cyan to-blue-600 flex items-center justify-center shadow-glow-cyan">
              <Shield className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Hackathon Badge / Problem Statement pill */}
        {!collapsed && (
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-border/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono text-sentra-sky flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                SIH-2026: PS 26145
              </span>
              <span className="text-slate-500 font-mono text-[10px]">Team 191970</span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
                } rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-sentra-cyan' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                      item.badgeColor || 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status & User Profile */}
      <div className="p-3 border-t border-border bg-background-subtle/30 space-y-2">
        {/* Unidirectional Hardware Diode Status Widget */}
        {!collapsed ? (
          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-border text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-sentra-cyan" />
                Diode Architecture
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                PASSIVE TAP
              </span>
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              Ingress Only • TX Disconnected
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-2" title="Passive Optical Tap Active (Read-Only)">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
        )}

        {/* User Card */}
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center p-2' : 'justify-between p-2'
          } rounded-lg bg-background-card border border-border/80`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-sentra-cyan font-mono font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.avatar}
            </div>
            {!collapsed && (
              <div className="leading-tight overflow-hidden">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {currentUser.role}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={logout}
              className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
              title="Sign Out (Demo)"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
