import React from 'react';
import { 
  Database, 
  LogOut, 
  ArrowLeft,
  Radio
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
    <header className="h-14 px-5 sm:px-6 border-b border-[#162134] flex items-center justify-between shrink-0 bg-[#0c111a] relative z-20 text-xs font-sans">
      {/* Left: Brand + Admin Console */}
      <div className="flex items-center gap-3.5">
        <div 
          onClick={onReturnToDashboard}
          title="Return to Surveillance Dashboard"
          className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="w-6 h-6 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#00e5ff]" />
          </div>
          <span className="font-extrabold text-white text-sm tracking-wider uppercase font-sans">
            CONTROL<span className="text-[#00e5ff]">F</span>
          </span>
        </div>

        <div className="h-4 w-px bg-[#1e2f49] hidden sm:block" />

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-extrabold uppercase tracking-wider text-[#00e5ff] font-mono">
              ADMIN CONSOLE
            </h1>
            <span className="px-1.5 py-0.2 rounded bg-[#101726] text-cyan-400 border border-[#1b2940] text-[9px] font-mono font-bold hidden md:inline">
              PROD // AUTH LEVEL 0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block font-mono">
            System Administration, Camera Fabric & Oracle 21c Management
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* 1. Oracle 21c XE Indicator Pill */}
        <div 
          title={`Oracle Database ${dbVersion} (${dbStatus})`}
          className="bg-[#090e17] rounded-xl px-3 py-1.5 border border-[#18263c] shadow-inner flex items-center gap-2 text-xs"
        >
          <div className="w-4 h-4 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Database className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-bold text-slate-200 hidden md:inline font-mono">
            Oracle {dbVersion}
          </span>
          <span className="relative flex h-2 w-2 shrink-0">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md hidden lg:inline border font-mono ${
            isConnected
              ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
              : 'text-rose-400 bg-rose-500/20 border-rose-500/30'
          }`}>
            {isConnected ? 'CONNECTED' : 'OFFLINE'}
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
          className="px-3 py-1.5 rounded-lg bg-[#111a28] hover:bg-[#18263a] text-slate-200 border border-[#1e2f49] font-bold text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">DASHBOARD</span>
        </button>

        {/* 3. Administrator Profile Pill */}
        <div className="bg-[#090e17] rounded-xl px-2.5 py-1 border border-[#18263c] flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#00e5ff] text-[#080b11] flex items-center justify-center font-extrabold text-[10px]">
            {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden xl:block text-left">
            <span className="font-bold text-white block text-[11px] leading-tight truncate max-w-[120px]">
              {currentUser?.fullName || currentUser?.username || 'Admin'}
            </span>
            <span className="text-[9px] font-mono font-bold text-[#00e5ff] block uppercase">
              ROLE: SUPER ADMIN
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

