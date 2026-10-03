import React from 'react';
import { useApp } from '@/context/AppContext';
import { ShieldCheck, ShieldAlert, Cpu, Radio, Zap } from 'lucide-react';

export const DetectionActivityFeed: React.FC = () => {
  const { alerts, setSelectedAlertId } = useApp();

  const events = [
    {
      time: '13:22:15',
      type: 'threat',
      title: 'Reconnaissance / Port Scan detected',
      target: 'Auth Server (10.0.0.30)',
      alertId: 'ALT-8921',
      score: 94,
    },
    {
      time: '13:18:40',
      type: 'threat',
      title: 'DDoS SYN Flood spike matched',
      target: 'E-Commerce (10.0.0.10)',
      alertId: 'ALT-8920',
      score: 97,
    },
    {
      time: '13:05:00',
      type: 'telemetry',
      title: 'Flow telemetry sliding window refreshed (500K packets)',
      target: 'Optical Diode Sensor eth0',
      score: null,
    },
    {
      time: '12:45:02',
      type: 'threat',
      title: 'Covert DNS Tunneling pattern flagged',
      target: 'DNS Core (10.0.0.40)',
      alertId: 'ALT-8919',
      score: 91,
    },
    {
      time: '12:10:00',
      type: 'system',
      title: 'Baseline behavioral vector matrix recalibrated',
      target: 'Inference Engine (Phase 5 RF)',
      score: null,
    },
  ];

  return (
    <div className="hud-bracket soc-card p-3.5 sm:p-4.5 bg-background-surface/90 border border-border min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-sentra-cyan animate-pulse" />
            Detection Activity Stream
          </h3>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">
            Sequential telemetry ingestion & classification log
          </p>
        </div>
        <span className="text-[9px] font-mono text-sentra-green bg-background px-2 py-0.5 rounded border border-sentra-green/30 font-bold uppercase tracking-wider">
          STREAM ACTIVE
        </span>
      </div>

      <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
        {events.map((ev, idx) => (
          <div
            key={idx}
            className={`relative group ${
              ev.alertId ? 'cursor-pointer' : ''
            }`}
            onClick={() => ev.alertId && setSelectedAlertId(ev.alertId)}
          >
            {/* Timeline node */}
            <div
              className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full border-2 border-background-surface ${
                ev.type === 'threat'
                  ? 'bg-sentra-danger ring-2 ring-sentra-danger/30'
                  : ev.type === 'telemetry'
                  ? 'bg-sentra-cyan ring-2 ring-sentra-cyan/30'
                  : 'bg-text-muted/60'
              }`}
            />

            <div className="flex items-start justify-between text-xs">
              <div className="space-y-0.5 pr-2">
                <div className="font-mono text-text group-hover:text-sentra-cyan transition-colors flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-xs">{ev.title}</span>
                  {ev.score && (
                    <span className="text-[9px] font-mono text-sentra-danger bg-sentra-danger/10 px-1 py-0.2 rounded border border-sentra-danger/30 font-bold">
                      {ev.score}%
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-text-muted font-mono">
                  {ev.target}
                </div>
              </div>
              <span className="text-[9px] font-mono text-text-muted shrink-0">
                {ev.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
