import React from 'react';
import { ServerTable } from '@/components/servers/ServerTable';
import { ServerDetailModal } from '@/components/servers/ServerDetailModal';

export const ServersPage: React.FC = () => {
  return (
    <div className="space-y-5">
      {/* Page Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 font-display">
          Monitored Servers & Network Assets
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage authorized servers and network assets monitored by SENTRA through passive unidirectional telemetry feeds.
        </p>
      </div>

      {/* Main Server Table & Filters */}
      <ServerTable />

      {/* Modals */}
      <ServerDetailModal />
    </div>
  );
};
