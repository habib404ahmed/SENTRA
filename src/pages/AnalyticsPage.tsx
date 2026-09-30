import React from 'react';
import { TrafficAnalyticsDashboard } from '@/components/analytics/TrafficAnalyticsDashboard';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100 font-display">
          Traffic Telemetry & Flow Analytics
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          High-resolution temporal flow analysis, transport protocol distributions, and top communicating endpoints.
        </p>
      </div>

      <TrafficAnalyticsDashboard />
    </div>
  );
};
