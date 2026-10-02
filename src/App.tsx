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
import { IngestionPage } from '@/pages/IngestionPage';
import { FeaturesPage } from '@/pages/FeaturesPage';
import { ModelsPage } from '@/pages/ModelsPage';
import { AddServerModal } from '@/components/servers/AddServerModal';

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
      case 'ingestion':
        return <IngestionPage />;
      case 'features':
        return <FeaturesPage />;
      case 'models':
        return <ModelsPage />;
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
    <div className="min-h-screen bg-background text-text flex soc-grid-bg relative selection:bg-sentra-cyan selection:text-black">
      {/* Subtle Scanline Overlay */}
      <div className="scanlines pointer-events-none fixed inset-0 z-40" />

      {/* Responsive Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pl-18 lg:pl-64 transition-all duration-300 relative z-10">
        <Header />
        
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>

        {/* Global Operational Footer */}
        <footer className="border-t border-border px-6 py-3.5 bg-background-subtle/80 text-xs text-text-muted flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-bold text-sentra-cyan tracking-widest">SENTRA // COMMAND</span>
            <span className="text-border-bright">•</span>
            <span className="text-text-muted">SIH PS 26145</span>
            <span className="text-border-bright">•</span>
            <span className="text-sentra-green font-semibold">PHASE 5: ML THREAT ENGINE</span>
          </div>

          <div className="text-[10px] text-text-muted/80 tracking-wider">
            UNIDIRECTIONAL IP DEFENSE • PASSIVE INGRESS TELEMETRY
          </div>
        </footer>
      </div>

      {/* Global Modals & Notifications */}
      <SearchModal />
      <AddServerModal />
      <Toast />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
