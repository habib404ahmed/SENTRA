import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#05070B]/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} max-w-[calc(100vw-1rem)] hud-bracket bg-background-surface border border-border-bright rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] sm:max-h-[88vh]`}
        role="dialog"
        aria-modal="true"
      >
        {/* Top cyan accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sentra-cyan/60 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between p-3.5 sm:p-5 border-b border-border bg-background-subtle shrink-0 gap-3">
          <div className="min-w-0">
            <h3 className="text-xs sm:text-base font-mono font-bold uppercase tracking-wider text-text flex items-center gap-2 truncate">
              <span className="w-1.5 h-3.5 bg-sentra-cyan rounded-sm shrink-0" />
              <span className="truncate">{title}</span>
            </h3>
            {subtitle && (
              <p className="text-[10px] sm:text-[11px] font-mono text-text-muted mt-1 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-sentra-cyan hover:bg-background-card p-1.5 rounded transition-colors border border-transparent hover:border-border shrink-0 touch-manipulation"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};
