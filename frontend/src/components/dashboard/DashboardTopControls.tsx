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
  onOpenOracleStatus?: () => void;
}

export const DashboardTopControls: React.FC<DashboardTopControlsProps> = ({
  isPlayingDemo = false,
  currentTime = 0,
  onPlayDemo,
  onOpenOracleStatus,
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
    setShowOracleModal,
    logout,
  } = useExperienceStore();

  // STRICT DASHBOARD-ONLY GUARD:
  // Visible ONLY when on the Main Dashboard / Home / Overview page and auth modal is not active.
  const isDashboard =
    stage === 'HOME' &&
    (activeFeedTab === 'home' || activeFeedTab === 'overview') &&
    !showAuthModal;

  if (!isDashboard) {
    return null;
  }

  const handleOracleClick = () => {
    if (onOpenOracleStatus) {
      onOpenOracleStatus();
    } else {
      setShowOracleModal(true);
    }
  };

  return (
    <nav 
      aria-label="Dashboard system controls"
      id="dashboard-top-controls"
      className="fixed top-2.5 right-3 sm:top-3 sm:right-5 z-50 flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end max-w-[calc(100vw-1.5rem)] pointer-events-auto transition-all duration-200 animate-fade-in font-sans"
    >
      {/* 1. Oracle 21c XE Operational Status Indicator */}
      <button 
        type="button"
        id="top-control-oracle"
        onClick={handleOracleClick}
        className="bg-white/95 backdrop-blur-xl rounded-xl px-3 py-1.5 border border-white/90 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center gap-2 text-xs cursor-pointer group bubble-btn bubble-pill"
        title="View Oracle 21c Database Health & Schema"
        style={{
          boxShadow: '0 4px 15px -3px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
        }}
      >
        <div className="w-4.5 h-4.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Database className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-bold text-slate-800 tracking-tight hidden md:inline">
          ORACLE 21c XE
        </span>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md hidden lg:inline border border-emerald-200/60">
          ONLINE
        </span>
      </button>

      {/* 2. Operator Profile / Login Button */}
      <div 
        id="top-control-operator"
        className="bg-white/95 backdrop-blur-xl rounded-xl px-3 py-1.5 border border-white/90 shadow-xs hover:shadow-md transition-all flex items-center gap-2 text-xs bubble-btn bubble-pill"
        style={{
          boxShadow: '0 4px 15px -3px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
        }}
      >
        {isAuthenticated && currentUser ? (
          <div className="flex items-center gap-2">
            <div className="w-4.5 h-4.5 rounded-lg bg-indigo-50 text-[#4361ee] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[11px] text-slate-900 max-w-[110px] truncate">
              {currentUser.fullName || currentUser.username || currentUser.email?.split('@')[0]}
            </span>
            <span className="px-2 py-0.5 rounded-lg text-[10px] bg-[#4361ee] text-white font-bold tracking-wide shadow-2xs">
              {currentUser.role || 'OPERATOR'}
            </span>
            <button
              type="button"
              onClick={logout}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ml-0.5"
              title="Log out operator session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 text-slate-700 hover:text-[#4361ee] font-semibold text-xs transition-colors cursor-pointer group"
            title="Open Operator Authentication"
          >
            <div className="w-4.5 h-4.5 rounded-lg bg-indigo-50 text-[#4361ee] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <LogIn className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold">OPERATOR LOGIN</span>
          </button>
        )}
      </div>

      {/* 3. System Status, Audio Mute & 10s Demo Controls */}
      <div 
        id="top-control-system"
        className="bg-white/95 backdrop-blur-xl rounded-xl px-3 py-1.5 border border-white/90 shadow-xs hover:shadow-md transition-all flex items-center gap-2.5 text-xs text-slate-800 bubble-btn bubble-pill"
        style={{
          boxShadow: '0 4px 15px -3px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
        }}
      >
        {/* System Stage Indicator */}
        <div className="flex items-center gap-1.5 font-sans">
          <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider hidden sm:inline">SYSTEM:</span>
          <span className="font-extrabold uppercase tracking-wider text-[11px] text-[#4361ee]">
            {stage}
          </span>
          {isPlayingDemo && (
            <span className="text-indigo-600 font-mono text-[10px] ml-1 font-semibold">
              ({currentTime.toFixed(1)}s)
            </span>
          )}
        </div>

        <div className="h-4 w-[1px] bg-slate-200" />

        {/* Sound Mute / Unmute Toggle */}
        <button
          type="button"
          id="top-control-sound-toggle"
          onClick={toggleSound}
          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-indigo-50 text-[#4361ee] border-indigo-200 hover:bg-indigo-100 shadow-2xs'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
          }`}
          title={soundEnabled ? 'Surveillance Audio Active (Press M to Mute)' : 'Audio Muted (Press M to Unmute)'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* 10s Reference Demo Toggle Button */}
        <button
          type="button"
          id="top-control-demo-toggle"
          onClick={onPlayDemo}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
            isPlayingDemo
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-300/50 animate-pulse'
              : 'bg-[#4361ee] hover:bg-[#364fc7] text-white shadow-indigo-300/40 hover:scale-102 active:scale-98'
          }`}
          title="Toggle 10-second reference sequence recreation"
        >
          {isPlayingDemo ? (
            <>
              <Pause className="w-3 h-3 fill-white" />
              <span className="hidden sm:inline">Stop Demo</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-white" />
              <span className="hidden sm:inline">10s Demo</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
};
