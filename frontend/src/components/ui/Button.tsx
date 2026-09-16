import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'sm',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const sizeStyles = {
      xs: 'text-[11px] px-2.5 py-1 gap-1.5',
      sm: 'text-xs px-3.5 py-1.5 gap-2',
      md: 'text-xs sm:text-sm px-4 py-2 gap-2',
      lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-[#00c4df] text-slate-950 font-semibold hover:bg-[#00d8f6] shadow-xs border border-[#00c4df] focus:ring-[#00c4df]',
      secondary:
        'bg-[#161e2e] text-slate-200 hover:bg-[#1a2536] border border-[#1a2536] hover:border-slate-700 shadow-2xs focus:ring-[#00c4df]',
      outline:
        'bg-transparent text-slate-300 hover:bg-[#161e2e] border border-[#1a2536] focus:ring-[#00c4df]',
      ghost:
        'bg-transparent text-slate-400 hover:text-white hover:bg-[#161e2e]/70 border-transparent shadow-none',
      danger:
        'bg-rose-600/90 text-white hover:bg-rose-600 shadow-xs border border-rose-500/40 focus:ring-rose-500',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
