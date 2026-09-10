import React from 'react';
import { 
  Database, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  Terminal, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause 
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';

export interface DashboardTopControlsProps {
  isPlayingDemo?: boolean;
  currentTime?: number;
  onPlayDemo?: () => void;
}

export const DashboardTopControls: React.FC<DashboardTopControlsProps> = ({
  isPlayingDemo = false,
  currentTime = 0,
  onPlayDemo,
}) => {
  const {
    stage,
    activeFeedTab,
    showAuthModal,
    soundEnabled,
    toggleSound,
    currentUser,
    isAuthenticated,
    setShowAuthModal,
    logout,
  } = useExperienceStore();

  // STRICT DASHBOARD-ONLY GUARD:
  // Visible ONLY when on the Main Dashboard / Home / Overview page and auth modal is not active.
  // Returns null on all other pages/routes/scenes (Find Object, Upload, CCTV Grid, Heatmaps, Logs, Settings, Search, Results).
  const isDashboard =
    stage === 'HOME' &&
    (activeFeedTab === 'home' || activeFeedTab === 'overview') &&
    !showAuthModal;

  if (!isDashboard) {
    return null;
  }

  return (
    <div
      id="dashboard-top-controls"
      className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-2 flex-wrap justify-end max-w-[calc(100vw-1.5rem)] pointer-events-auto transition-opacity duration-200 animate-fade-in"
    >
      {/* 1. Oracle 21c XE Operational Status Indicator */}
      <div 
        id="top-control-oracle"
        className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-1.5 border border-[#E5E7EB] dark:border-slate-800 shadow-xs flex items-center gap-2 text-xs font-sans transition-all"
      >
        <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 tracking-tight hidden md:inline">
          ORACLE 21c XE
        </span>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </div>

      {/* 2. Operator Profile / Login Button */}
      <div 
        id="top-control-operator"
        className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-1.5 border border-[#E5E7EB] dark:border-slate-800 shadow-xs flex items-center gap-2 text-xs font-sans transition-all"
      >
        {isAuthenticated && currentUser ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4361ee] shrink-0" />
              <span className="font-semibold text-[11px] text-slate-900 dark:text-white">
                {currentUser.username || currentUser.fullName || currentUser.email?.split('@')[0]}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] bg-[#4361ee] text-white font-bold tracking-wide">
                {currentUser.role || 'ADMIN'}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Log out operator"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 text-[#4361ee] hover:text-[#364fc7] font-semibold text-xs transition-colors cursor-pointer"
            title="Open Operator Authentication"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="text-[11px]">OPERATOR LOGIN</span>
          </button>
        )}
      </div>

      {/* 3. System & Audio Controls */}
      <div 
        id="top-control-system"
        className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-1.5 border border-[#E5E7EB] dark:border-slate-800 shadow-xs flex items-center gap-2.5 text-xs font-sans transition-all"
      >
        {/* System: Home Indicator */}
        <div className="flex items-center gap-1.5 font-sans">
          <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-800 dark:text-slate-200 font-bold text-[11px] hidden sm:inline">SYSTEM:</span>
          <span className="font-bold uppercase tracking-wider text-[11px] text-[#4361ee]">
            {stage}
          </span>
          {isPlayingDemo && (
            <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] ml-1 font-semibold">
              (DEMO {currentTime.toFixed(1)}s)
            </span>
          )}
        </div>

        <div className="h-4 w-[1px] bg-[#E5E7EB] dark:bg-slate-700" />

        {/* 4. Sound Mute Toggle */}
        <button
          type="button"
          id="top-control-sound-toggle"
          onClick={toggleSound}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-indigo-50 text-[#4361ee] border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:border-indigo-800'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#E5E7EB] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900'
          }`}
          title={soundEnabled ? 'Audio Active (Press M to Mute)' : 'Audio Muted (Press M to Unmute)'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* 5. 10s Reference Demo Toggle */}
        <button
          type="button"
          id="top-control-demo-toggle"
          onClick={onPlayDemo}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            isPlayingDemo
              ? 'bg-indigo-50 text-[#4361ee] border-indigo-300 shadow-xs animate-pulse dark:bg-indigo-950/50 dark:border-indigo-700'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-[#E5E7EB] dark:border-slate-700 shadow-2xs'
          }`}
          title="Toggle 10-second reference sequence recreation"
        >
          {isPlayingDemo ? <Pause className="w-3 h-3 text-[#4361ee]" /> : <Play className="w-3 h-3 text-[#4361ee]" />}
          <span className="hidden sm:inline">{isPlayingDemo ? 'Stop Demo' : '10s Demo'}</span>
        </button>
      </div>
    </div>
  );
};
