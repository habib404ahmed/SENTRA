import React from 'react';
import { ThreatIntelligenceView } from '@/components/intel/ThreatIntelligenceView';

export const IntelligencePage: React.FC = () => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100 font-display">
          Threat Intelligence & Attack Signatures
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Behavioral attack taxonomies and observed source subnets tailored for unidirectional and data diode network security.
        </p>
      </div>

      <ThreatIntelligenceView />
    </div>
  );
};
