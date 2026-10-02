import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium uppercase tracking-wider rounded transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] font-mono text-xs';

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2',
    lg: 'text-sm px-4.5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-sentra-cyan text-[#05070B] font-bold hover:bg-[#33ebff] active:bg-[#00c4db] focus:ring-sentra-cyan shadow-glow-cyan border border-sentra-cyan/60 hover:shadow-[0_0_16px_rgba(0,229,255,0.45)]',
    secondary: 'bg-background-card hover:bg-background-cardHover text-text border border-border hover:border-border-bright focus:ring-border-bright shadow-sm hover:shadow-[0_0_10px_rgba(37,50,68,0.5)]',
    danger: 'bg-sentra-danger/15 text-sentra-danger border border-sentra-danger/40 hover:bg-sentra-danger/25 hover:border-sentra-danger/70 focus:ring-sentra-danger hover:shadow-[0_0_12px_rgba(255,23,68,0.35)]',
    outline: 'border border-border text-text-muted hover:border-sentra-cyan/50 hover:text-text focus:ring-sentra-cyan/50 hover:shadow-[0_0_10px_rgba(0,229,255,0.2)]',
    ghost: 'text-text-muted hover:text-text hover:bg-background-card/60 focus:ring-border',
    success: 'bg-sentra-green/15 text-sentra-green border border-sentra-green/40 hover:bg-sentra-green/25 focus:ring-sentra-green hover:shadow-[0_0_12px_rgba(0,230,118,0.3)]',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
