import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightElement,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-mono uppercase tracking-wider text-text-muted">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-text-muted pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          className={`w-full bg-background border ${
            error ? 'border-sentra-danger focus:border-sentra-danger focus:ring-sentra-danger/20' : 'border-border focus:border-sentra-cyan focus:ring-sentra-cyan/30'
          } rounded px-3 py-1.5 text-xs font-mono text-text placeholder-text-muted/60 focus:outline-none focus:ring-1 transition-colors ${
            leftIcon ? 'pl-8' : ''
          } ${rightElement ? 'pr-9' : ''} ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[10px] font-mono text-sentra-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[10px] font-mono text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
