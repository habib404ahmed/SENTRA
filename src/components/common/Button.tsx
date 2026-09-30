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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-4 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-sentra-cyan text-slate-950 font-semibold hover:bg-sentra-sky active:bg-cyan-600 focus:ring-cyan-500 shadow-glow-cyan',
    secondary: 'bg-background-card hover:bg-background-cardHover text-slate-200 border border-border hover:border-slate-600 focus:ring-slate-500',
    danger: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 focus:ring-rose-500',
    outline: 'border border-border text-slate-300 hover:bg-slate-800/60 hover:text-white focus:ring-slate-500',
    ghost: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 focus:ring-slate-500',
    success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 focus:ring-emerald-500',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
