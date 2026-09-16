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
    <div className={`p-8 sm:p-10 rounded-2xl bg-[#0f1520] border border-[#1a2536] text-center flex flex-col items-center justify-center max-w-md mx-auto my-4 shadow-sm animate-fade-in ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[#161e2e] border border-[#1a2536] text-[#00c4df] flex items-center justify-center mb-3 shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-white font-mono tracking-wide">{title}</h3>
      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-[#161e2e] hover:bg-[#1a2536] text-white border border-[#1a2536] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#00c4df]" />
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
    <div className={`p-10 rounded-2xl bg-[#0f1520] border border-[#1a2536] text-center flex flex-col items-center justify-center max-w-md mx-auto my-4 shadow-sm animate-fade-in ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-[#00c4df]/10 border border-[#00c4df]/20 text-[#00c4df] flex items-center justify-center mb-3 shadow-2xs">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
      <h3 className="text-xs font-bold text-white font-mono tracking-wide uppercase">{message}</h3>
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
    <div className={`p-6 sm:p-8 rounded-2xl bg-[#0f1520] border border-rose-500/30 text-center flex flex-col items-center justify-center max-w-md mx-auto my-4 shadow-sm animate-shake ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wide">{title}</h3>
      <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
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
    <div className={`p-8 sm:p-10 rounded-2xl bg-[#0f1520] border border-amber-500/30 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 shadow-sm animate-fade-in ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 shadow-2xs">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-amber-400 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 mb-2">
        <span>SECURITY CLEARANCE RESTRICTED</span>
      </div>
      <h3 className="text-sm font-bold text-white font-mono">
        Elevated Privilege Required
      </h3>
      <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
        Access to this operational interface is restricted to users with <strong className="text-white">{requiredRole}</strong> clearance. Your current active session is cleared for <span className="font-mono text-amber-400 font-bold">{currentRole}</span> privileges.
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-[#00c4df] hover:bg-[#00d8f6] text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
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
    <div className={`p-6 sm:p-8 rounded-2xl bg-[#0f1520] text-white border border-[#1a2536] text-center flex flex-col items-center justify-center max-w-md mx-auto my-4 shadow-xl animate-fade-in ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/20">
        <WifiOff className="w-5 h-5" />
      </div>
      <h3 className="text-xs font-bold font-mono tracking-wide uppercase text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">{message}</p>
      {onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-[#161e2e] hover:bg-[#1a2536] text-[#00c4df] border border-[#00c4df]/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reconnect Stream</span>
        </button>
      )}
    </div>
  );
};
