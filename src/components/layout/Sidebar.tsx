import React, { useEffect } from 'react';
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
  Sliders,
  Brain,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activePage, 
    setActivePage, 
    alerts, 
    servers, 
    currentUser, 
    logout,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed
  } = useApp();

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const activeAlertsCount = alerts.filter(a => a.status === 'active' || a.status === 'new' || a.status === 'investigating').length;
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
      id: 'models',
      label: 'AI/ML Models',
      icon: <Brain className="w-4 h-4" />,
      badge: 'Phase 5',
      badgeColor: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
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
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#05070B]/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Responsive Navigation Container */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 lg:z-30 flex flex-col justify-between bg-background-subtle border-r border-border transition-all duration-300 ease-in-out select-none ${
          /* Desktop collapsed or expanded width */
          isSidebarCollapsed ? 'lg:w-18' : 'lg:w-64'
        } ${
          /* Mobile slide-out drawer behavior */
          isMobileMenuOpen
            ? 'translate-x-0 w-72 max-w-[85vw] shadow-2xl'
            : '-translate-x-full lg:translate-x-0 w-72'
        }`}
        aria-label="Platform Sidebar Navigation"
      >
        {/* Top Branding Section */}
        <div className="flex flex-col min-h-0">
          <div className="h-16 flex items-center justify-between px-3.5 border-b border-border bg-background/90 relative">
            {/* Cyan glow accent line along bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sentra-cyan/40 to-transparent" />

            {/* Logo and Titles: Show full branding when expanded or on mobile drawer */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded bg-background border border-sentra-cyan/40 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-sentra-cyan stroke-[2.2]" />
              </div>

              <div className={`leading-tight ${isSidebarCollapsed ? 'hidden lg:hidden' : 'block'} lg:block`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-wider text-sm text-slate-100">
                    SENTRA
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30 font-semibold">
                    SOC
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 truncate max-w-[145px]">
                  AI Threat Defense
                </p>
              </div>
            </div>

            {/* Actions: Mobile Close Button OR Desktop Collapse Button */}
            <div className="flex items-center gap-1">
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-background-card transition-colors lg:hidden"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Desktop Expand / Collapse Button */}
              <button
                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                className="hidden lg:flex p-1.5 rounded text-text-muted hover:text-sentra-cyan hover:bg-background-card transition-colors border border-transparent hover:border-border"
                title={isSidebarCollapsed ? "Expand sidebar console" : "Collapse sidebar console"}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Technical Sub-Header / Problem Statement badge */}
          <div className={`px-3.5 py-2 bg-background/50 border-b border-border/70 items-center justify-between text-[10px] ${
            isSidebarCollapsed ? 'hidden lg:hidden' : 'flex'
          }`}>
            <span className="text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sentra-green animate-pulse" />
              <span>Unidirectional Tap</span>
            </span>
            <span className="text-slate-600 font-mono">SIH-26145</span>
          </div>

          {/* Navigation Items */}
          <nav className="p-2.5 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'lg:justify-center px-3 py-2.5 lg:px-2' : 'justify-between px-3 py-2'
                  } rounded text-xs font-mono transition-all duration-200 relative group touch-manipulation min-h-[38px] ${
                    isActive
                      ? 'bg-background-card text-sentra-cyan font-bold border border-sentra-cyan/50 shadow-[0_0_12px_rgba(0,229,255,0.18)]'
                      : 'text-text-muted hover:text-text hover:bg-background-card/50 border border-transparent hover:border-border/60'
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-sentra-cyan rounded-r shadow-[0_0_8px_#00E5FF]" />
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 transition-transform duration-200 ${isActive ? 'text-sentra-cyan' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {item.icon}
                    </span>
                    <span className={`tracking-wide text-[11px] truncate font-medium ${
                      isSidebarCollapsed ? 'lg:hidden' : 'block'
                    }`}>
                      {item.label}
                    </span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight shrink-0 ${
                        isSidebarCollapsed ? 'lg:hidden' : 'inline-block'
                      } ${item.badgeColor || 'bg-background text-text-muted border border-border'}`}
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
        <div className="p-2.5 border-t border-border bg-background/80 space-y-2">
          {/* Unidirectional Hardware Diode Status Widget */}
          <div className={`${isSidebarCollapsed ? 'lg:hidden' : 'block'} p-2 rounded bg-background border border-border text-xs space-y-1 relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-sentra-cyan" />
                Diode Bridge
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-sentra-green font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-sentra-green animate-ping"></span>
                INGRESS
              </span>
            </div>
            <div className="text-[10px] font-mono text-text-muted/80 leading-tight">
              RX Tap Only • TX Severed
            </div>
          </div>

          {/* User Card */}
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'lg:justify-center p-1.5' : 'justify-between p-2'
            } rounded bg-background-card border border-border`}
          >
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div className="w-7 h-7 rounded bg-background border border-border-bright text-sentra-cyan font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {currentUser.avatar}
              </div>
              <div className={`leading-tight overflow-hidden ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                <div className="text-xs font-mono font-semibold text-text truncate">
                  {currentUser.name}
                </div>
                <div className="text-[9px] text-text-muted font-mono uppercase truncate">
                  {currentUser.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className={`text-text-muted hover:text-sentra-danger p-1.5 rounded hover:bg-background transition-colors touch-manipulation ${
                isSidebarCollapsed ? 'lg:hidden' : 'block'
              }`}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
