import React from 'react';
import { 
  Database, 
  LogOut, 
  ArrowLeft 
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';

interface AdminHeaderProps {
  onReturnToDashboard: () => void;
  dbStatus?: string;
  dbVersion?: string;
  latencyMs?: number;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onReturnToDashboard,
  dbStatus = 'CONNECTED',
  dbVersion = '21c XE',
  latencyMs = 2,
}) => {
  const { currentUser, logout } = useExperienceStore();

  const handleLogout = async () => {
    await logout();
    onReturnToDashboard();
  };

  const isConnected = dbStatus === 'CONNECTED' || dbStatus === 'CONNECTED_FALLBACK';

  return (
    <header className="h-16 px-6 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-xl relative z-20 text-xs font-sans">
      {/* Left: 3-dot logo + "CONTROL F" + "ADMIN CONSOLE" + subtitle */}
      <div className="flex items-center gap-3.5">
        <div 
          onClick={onReturnToDashboard}
          title="Return to Surveillance Dashboard"
          className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="w-5 h-5 flex flex-wrap gap-0.5 items-center justify-center p-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </div>
          <span className="font-black text-slate-900 text-sm tracking-tight uppercase">
            CONTROL F
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-black uppercase tracking-wider text-indigo-600">
              ADMIN CONSOLE
            </h1>
            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono font-bold hidden md:inline">
              PROD
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            System Administration & Database Management
          </p>
        </div>
      </div>

      {/* Right Controls: Same rounded controls as CTRL-F */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 1. Oracle 21c XE Indicator Pill */}
        <div 
          title={`Oracle Database ${dbVersion} (${dbStatus})`}
          className="bg-slate-100/90 rounded-2xl px-3 py-1.5 border border-slate-200/80 shadow-2xs flex items-center gap-2 text-xs"
        >
          <div className="w-4 h-4 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Database className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-bold text-slate-800 hidden md:inline font-mono">
            Oracle {dbVersion}
          </span>
          <span className="relative flex h-2 w-2 shrink-0">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md hidden lg:inline border ${
            isConnected
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-red-700 bg-red-50 border-red-200'
          }`}>
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
            {latencyMs}ms
          </span>
        </div>

        {/* 2. Return to Dashboard Button */}
        <button
          type="button"
          onClick={onReturnToDashboard}
          title="Return to Surveillance Operations Dashboard"
          className="px-3.5 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        {/* 3. Administrator Profile Pill */}
        <div className="bg-slate-100/90 rounded-2xl px-3 py-1.5 border border-slate-200/80 shadow-2xs flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
            {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden xl:block text-left">
            <span className="font-bold text-slate-900 block text-[11px] leading-tight truncate max-w-[120px]">
              {currentUser?.fullName || currentUser?.username || 'Admin'}
            </span>
            <span className="text-[9px] font-mono font-bold text-indigo-600 block uppercase">
              ROLE: ADMIN
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
