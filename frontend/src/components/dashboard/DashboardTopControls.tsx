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
      className="fixed top-2.5 right-3 sm:top-3 sm:right-5 z-50 flex items-center gap-2 flex-wrap justify-end max-w-[calc(100vw-1.5rem)] pointer-events-auto transition-all duration-200 animate-fade-in font-sans"
    >
      {/* 1. Oracle 21c XE Operational Status Indicator */}
      <button 
        type="button"
        id="top-control-oracle"
        onClick={handleOracleClick}
        className="bg-[#0f1520]/95 backdrop-blur-md rounded-lg px-3 py-1.5 border border-[#1a2536] shadow-sm hover:border-slate-700 transition-all flex items-center gap-2 text-xs cursor-pointer group"
        title="View Oracle 21c Database Health & Schema"
      >
        <div className="w-4 h-4 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
          <Database className="w-3 h-3" />
        </div>
        <span className="text-[11px] font-bold text-slate-200 tracking-tight hidden md:inline font-mono">
          ORACLE 21c
        </span>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded hidden lg:inline border border-emerald-500/30">
          ONLINE
        </span>
      </button>

      {/* 2. Operator Profile / Login Button */}
      <div 
        id="top-control-operator"
        className="bg-[#0f1520]/95 backdrop-blur-md rounded-lg px-3 py-1.5 border border-[#1a2536] shadow-sm flex items-center gap-2 text-xs"
      >
        {isAuthenticated && currentUser ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#161e2e] text-[#00c4df] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <span className="font-semibold text-[11px] text-white max-w-[110px] truncate">
              {currentUser.fullName || currentUser.username || currentUser.email?.split('@')[0]}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#161e2e] border border-[#1a2536] text-slate-300 font-bold">
              {currentUser.role || 'OPERATOR'}
            </span>
            <button
              type="button"
              onClick={logout}
              className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors cursor-pointer ml-0.5"
              title="Log out operator session"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer group"
            title="Open Operator Authentication"
          >
            <div className="w-4 h-4 rounded bg-[#161e2e] text-[#00c4df] flex items-center justify-center shrink-0">
              <LogIn className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-bold font-mono">OPERATOR LOGIN</span>
          </button>
        )}
      </div>

      {/* 3. System Status, Audio Mute & 10s Demo Controls */}
      <div 
        id="top-control-system"
        className="bg-[#0f1520]/95 backdrop-blur-md rounded-lg px-3 py-1.5 border border-[#1a2536] shadow-sm flex items-center gap-2 text-xs text-slate-200"
      >
        {/* System Stage Indicator */}
        <div className="flex items-center gap-1.5 font-mono">
          <Terminal className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider hidden sm:inline">SYS:</span>
          <span className="font-bold uppercase tracking-wider text-[11px] text-white">
            {stage}
          </span>
          {isPlayingDemo && (
            <span className="text-[#00c4df] font-mono text-[10px] ml-1 font-semibold">
              ({currentTime.toFixed(1)}s)
            </span>
          )}
        </div>

        <div className="h-3.5 w-[1px] bg-[#1a2536]" />

        {/* Sound Mute / Unmute Toggle */}
        <button
          type="button"
          id="top-control-sound-toggle"
          onClick={toggleSound}
          className={`p-1 rounded border transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-[#161e2e] text-slate-200 border-[#1a2536] hover:bg-[#1a2536]'
              : 'bg-[#0f1520] text-slate-500 border-[#1a2536] hover:bg-[#161e2e] hover:text-slate-300'
          }`}
          title={soundEnabled ? 'Surveillance Audio Active (Press M to Mute)' : 'Audio Muted (Press M to Unmute)'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#00c4df]" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* 10s Reference Demo Toggle Button */}
        <button
          type="button"
          id="top-control-demo-toggle"
          onClick={onPlayDemo}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
            isPlayingDemo
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
              : 'bg-[#161e2e] hover:bg-[#1a2536] text-slate-200 border border-[#1a2536] shadow-xs active:scale-95'
          }`}
          title="Toggle 10-second reference sequence recreation"
        >
          {isPlayingDemo ? (
            <>
              <Pause className="w-3 h-3 fill-white" />
              <span className="hidden sm:inline">Stop</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-white" />
              <span className="hidden sm:inline font-mono">10s Demo</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
};
