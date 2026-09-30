import React from 'react';
import { AlertTable } from '@/components/alerts/AlertTable';
import { AlertDetailModal } from '@/components/alerts/AlertDetailModal';

export const AlertsPage: React.FC = () => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100 font-display">
          Threat Alerts & Incident Management
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Real-time AI-classified anomalous network behavior identified from passive unidirectional IP telemetry.
        </p>
      </div>

      {/* Main Alert Table */}
      <AlertTable />

      {/* Alert Detail Modal */}
      <AlertDetailModal />
    </div>
  );
};
