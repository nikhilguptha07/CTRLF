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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 flex items-center justify-center p-4 select-none font-sans">
      {/* Floating Light Card Container */}
      <div 
        className="relative z-10 w-full max-w-lg rounded-3xl bg-white/95 backdrop-blur-2xl border border-slate-200/80 shadow-2xl overflow-hidden p-8 sm:p-10 text-center animate-scale-in"
        style={{
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        }}
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-[#4361ee]" />

        {/* 3-Dot CTRL-F Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-5 h-5 flex flex-wrap gap-0.5 items-center justify-center p-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </div>
          <span className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">CONTROL F</span>
          <span className="text-slate-400 text-xs">/ security</span>
        </div>

        {/* Shield Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-5 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
          ACCESS DENIED
        </h1>
        <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-4">
          403 Forbidden · Administrative Privileges Required
        </p>

        {/* Context message */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed mb-6 text-left">
          {isAuthenticated && currentUser ? (
            <div className="space-y-1.5">
              <p>
                You are currently signed in as <strong className="text-slate-900">{currentUser.email}</strong> with role <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold">{currentUser.role}</span>.
              </p>
              <p className="text-slate-500 text-[11px]">
                The Control F Admin Console is strictly reserved for users with the <code className="text-indigo-600 font-bold">ADMIN</code> role. Normal Operators and Viewers may not access system administration tools or database telemetry.
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
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4361ee] hover:bg-[#3a56d4] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-indigo-500/20"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{isAuthenticated ? 'Switch Account' : 'Sign In as Administrator'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
