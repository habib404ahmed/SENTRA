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
    <div className="min-h-screen bg-background text-sentra-text flex relative selection:bg-sky-500/20 selection:text-white">
      {/* Responsive Enterprise Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pl-18 lg:pl-64 transition-all duration-300 relative z-10">
        <Header />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>

        {/* Global Operational Footer */}
        <footer className="border-t border-border px-6 py-3 bg-background-subtle text-xs text-sentra-muted flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-300">SENTRA</span>
            <span className="text-slate-600">•</span>
            <span>AI Cyber Threat Detection in Unidirectional IP Traffic</span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline">SIH 26145</span>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Passive Optical Tap • Zero Return-Path Emissions
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
