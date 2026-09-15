import React from 'react';

export interface StatusIndicatorProps {
  status?: 'online' | 'busy' | 'offline' | 'warning' | 'idle';
  label?: string;
  subLabel?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status = 'online',
  label,
  subLabel,
  pulse = true,
  size = 'sm',
  className = '',
}) => {
  const dotColor = {
    online: 'bg-emerald-500',
    busy: 'bg-indigo-500',
    warning: 'bg-amber-500',
    offline: 'bg-slate-400',
    idle: 'bg-blue-400',
  }[status];

  const pingColor = {
    online: 'bg-emerald-400',
    busy: 'bg-indigo-400',
    warning: 'bg-amber-400',
    offline: 'bg-slate-300',
    idle: 'bg-blue-300',
  }[status];

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <span className={`relative flex ${dotSize} shrink-0`}>
        {pulse && status === 'online' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingColor}`} />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${dotColor}`} />
      </span>
      {label && (
        <span className="text-xs font-semibold text-slate-800 tracking-tight">
          {label}
        </span>
      )}
      {subLabel && (
        <span className="text-[10px] font-mono text-slate-500">
          {subLabel}
        </span>
      )}
    </div>
  );
};
