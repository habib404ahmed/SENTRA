import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useApp();

  if (!toast.show) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sentra-cyan shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/40 bg-emerald-950/90 shadow-glow-emerald',
    warning: 'border-amber-500/40 bg-amber-950/90',
    error: 'border-rose-500/40 bg-rose-950/90 shadow-glow-rose',
    info: 'border-sentra-cyan/40 bg-slate-900/95 shadow-glow-cyan',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-2xl max-w-md ${borders[toast.type]}`}
      >
        {icons[toast.type]}
        <div className="text-sm font-medium text-slate-100 flex-1">
          {toast.message}
        </div>
        <button
          onClick={hideToast}
          className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
