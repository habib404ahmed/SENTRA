import React from 'react';
import { SettingsView } from '@/components/settings/SettingsView';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100 font-display">
          Platform & Sensor Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure passive tap hardware bounds, future ML classification threshold levels, and SIH project metadata.
        </p>
      </div>

      <SettingsView />
    </div>
  );
};
