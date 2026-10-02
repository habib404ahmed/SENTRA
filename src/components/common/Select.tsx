import React, { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-[11px] font-mono uppercase tracking-wider text-text-muted">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          className={`w-full appearance-none bg-background border ${
            error ? 'border-sentra-danger' : 'border-border focus:border-sentra-cyan'
          } rounded px-3 py-1.5 pr-8 text-xs font-mono text-text focus:outline-none focus:ring-1 focus:ring-sentra-cyan/30 transition-colors ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-background-card text-text">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {error ? (
        <p className="text-[10px] font-mono text-sentra-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[10px] font-mono text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
