import React from 'react';
import { ReportsView } from '@/components/reports/ReportsView';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100 font-display">
          Compliance & Threat Reports
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Automated executive security digests, incident audit records, and exportable forensic CSV and PDF packages.
        </p>
      </div>

      <ReportsView />
    </div>
  );
};
