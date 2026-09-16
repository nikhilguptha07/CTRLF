import React from 'react';
import { ShieldAlert, ArrowLeft, LogIn, Lock } from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';

interface AdminAccessDeniedProps {
  onReturnToDashboard: () => void;
  onOpenLogin: () => void;
}

export const AdminAccessDenied: React.FC<AdminAccessDeniedProps> = ({
  onReturnToDashboard,
  onOpenLogin,
}) => {
  const { currentUser, isAuthenticated } = useExperienceStore();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090d14] flex items-center justify-center p-4 select-none font-sans">
      {/* Dark Panel Container */}
      <div 
        className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-2xl overflow-hidden p-8 sm:p-10 text-center animate-scale-in"
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-[#00c4df]" />

        {/* 3-Dot CTRL-F Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-5 h-5 flex flex-wrap gap-0.5 items-center justify-center p-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c4df]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c4df]/80" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c4df]/60" />
          </div>
          <span className="font-extrabold text-white text-sm tracking-tight uppercase font-mono">CONTROL F</span>
          <span className="text-slate-500 text-xs font-mono">/ security</span>
        </div>

        {/* Shield Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          ACCESS RESTRICTED
        </h1>
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 mb-4">
          403 Forbidden · Administrative Privileges Required
        </p>

        {/* Context message */}
        <div className="p-4 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-300 leading-relaxed mb-6 text-left">
          {isAuthenticated && currentUser ? (
            <div className="space-y-1.5">
              <p>
                You are currently signed in as <strong className="text-white">{currentUser.email}</strong> with role <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold">{currentUser.role}</span>.
              </p>
              <p className="text-slate-400 text-[11px]">
                The Control F Admin Console is strictly reserved for users with the <code className="text-[#00c4df] font-bold">ADMIN</code> role. Normal Operators and Viewers may not access system administration tools or database telemetry.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Authentication token missing. You must be authenticated as an authorized System Administrator to access this interface.
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onReturnToDashboard}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#161e2e] hover:bg-[#1a2536] text-slate-200 border border-[#1a2536] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#00c4df] hover:bg-[#00d8f6] text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{isAuthenticated ? 'Switch Account' : 'Sign In as Administrator'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
