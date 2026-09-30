import React from 'react';
import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SearchModal } from '@/components/layout/SearchModal';
import { Toast } from '@/components/common/Toast';
import { OverviewPage } from '@/pages/OverviewPage';
import { ServersPage } from '@/pages/ServersPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { IntelligencePage } from '@/pages/IntelligencePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/LoginPage';

export const AppContent: React.FC = () => {
  const { activePage, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage />;
      case 'servers':
        return <ServersPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'intelligence':
        return <IntelligencePage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex">
      {/* Responsive Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pl-20 lg:pl-64 transition-all duration-300">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-border/80 px-6 py-4 bg-background-surface/50 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-slate-400">SENTRA</span>
            <span>•</span>
            <span>SIH 2026 Problem Statement 26145</span>
            <span>•</span>
            <span className="font-mono text-sentra-cyan/80">Phase 1 UI/UX Prototype</span>
          </div>

          <div className="font-mono text-[11px] text-slate-500">
            Team Sentra 1 (ID: 191970) • Unidirectional IP Threat Detection
          </div>
        </footer>
      </div>

      {/* Global Modals & Notifications */}
      <SearchModal />
      <Toast />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
