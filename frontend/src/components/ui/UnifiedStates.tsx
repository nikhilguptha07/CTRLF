import React from 'react';
import { 
  Loader2, 
  AlertCircle, 
  ShieldAlert, 
  WifiOff, 
  RefreshCw, 
  Inbox, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* =======================================================================
   1. EMPTY STATE
   ======================================================================= */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-10 rounded-2xl bg-white/60 border border-slate-200/80 text-center flex flex-col items-center justify-center max-w-md mx-auto my-4 shadow-2xs animate-fade-in ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mb-3 shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 font-sans tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 font-sans mt-1 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
        </button>
      )}
    </div>
  );
};

/* =======================================================================
   2. LOADING STATE
   ======================================================================= */
interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading telemetry & surveillance streams...',
  subMessage = 'Connecting to high-speed node cluster',
  className = '',
}) => {
  return (
    <div className={`p-10 rounded-2xl bg-white/60 border border-slate-200/80 text-center flex flex-col items-center justify-center max-w-md mx-auto my-4 shadow-2xs animate-fade-in ${className}`}>
      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
      <h3 className="text-xs font-bold text-slate-800 font-mono tracking-wide uppercase">{message}</h3>
      {subMessage && (
        <p className="text-[11px] text-slate-400 font-mono mt-1">{subMessage}</p>
      )}
    </div>
  );
};

/* =======================================================================
   3. ERROR STATE
   ======================================================================= */
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Telemetry Ingestion Error',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-6 sm:p-8 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-center flex flex-col items-center justify-center max-w-md mx-auto my-4 shadow-2xs animate-shake ${className}`}>
      <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-xs font-bold text-rose-900 font-mono uppercase tracking-wide">{title}</h3>
      <p className="text-xs text-rose-700 font-sans mt-1 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </button>
      )}
    </div>
  );
};

/* =======================================================================
   4. PERMISSION DENIED (RBAC) STATE
   ======================================================================= */
interface PermissionDeniedStateProps {
  requiredRole?: string;
  currentRole?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const PermissionDeniedState: React.FC<PermissionDeniedStateProps> = ({
  requiredRole = 'ADMINISTRATOR',
  currentRole = 'OPERATOR',
  actionLabel = 'Switch Access Role',
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-10 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 shadow-2xs animate-fade-in ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mb-3 shadow-2xs">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-amber-800 uppercase px-2 py-0.5 rounded bg-amber-100/80 border border-amber-200 mb-2">
        <span>SECURITY CLEARANCE RESTRICTED</span>
      </div>
      <h3 className="text-sm font-bold text-slate-900 font-sans">
        Elevated Privilege Required
      </h3>
      <p className="text-xs text-slate-600 font-sans mt-1 leading-relaxed">
        Access to this operational interface is restricted to users with <strong className="text-slate-900">{requiredRole}</strong> clearance. Your current active session is cleared for <span className="font-mono text-slate-700 font-bold">{currentRole}</span> privileges.
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

/* =======================================================================
   5. OFFLINE / DISCONNECTED STATE
   ======================================================================= */
interface OfflineStateProps {
  title?: string;
  message?: string;
  onReconnect?: () => void;
  className?: string;
}

export const OfflineState: React.FC<OfflineStateProps> = ({
  title = 'Surveillance Stream Disconnected',
  message = 'Telemetry heartbeat interrupted. Attempting automated handshake with edge gateway.',
  onReconnect,
  className = '',
}) => {
  return (
    <div className={`p-6 sm:p-8 rounded-2xl bg-slate-900 text-white border border-slate-800 text-center flex flex-col items-center justify-center max-w-md mx-auto my-4 shadow-xl animate-fade-in ${className}`}>
      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/30">
        <WifiOff className="w-5 h-5" />
      </div>
      <h3 className="text-xs font-bold font-mono tracking-wide uppercase text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">{message}</p>
      {onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reconnect Stream</span>
        </button>
      )}
    </div>
  );
};
