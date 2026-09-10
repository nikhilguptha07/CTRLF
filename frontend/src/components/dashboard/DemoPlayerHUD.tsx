import React from 'react';
import { Square, Sparkles } from 'lucide-react';

interface DemoPlayerHUDProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration?: number;
  onStop: () => void;
}

export const DemoPlayerHUD: React.FC<DemoPlayerHUDProps> = ({
  isPlaying,
  currentTime,
  totalDuration = 10.0,
  onStop,
}) => {
  if (!isPlaying) return null;

  const progressPercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  // Determine current milestone scene name
  let sceneName = 'Scene 1: Main Dashboard';
  if (currentTime >= 7.96) {
    sceneName = 'Scene 4: Target Acquired & Hologram HUD';
  } else if (currentTime >= 6.71) {
    sceneName = 'Scene 3: Optical Lock & Monitor Projection';
  } else if (currentTime >= 3.90) {
    sceneName = 'Scene 2: 360° Studio Camera Sweep';
  } else if (currentTime >= 1.15) {
    sceneName = 'Scene 1: CCTV Stream Connection';
  }

  return (
    <aside 
      aria-label="Demo playback controls"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-auto font-sans"
    >
      <div 
        className="bg-white/95 backdrop-blur-xl border border-white/90 rounded-2xl shadow-xl p-2 sm:px-4 sm:py-2.5 flex items-center gap-3.5 text-xs text-slate-800"
        style={{
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        }}
      >
        {/* Live Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#4361ee] text-white font-bold text-[11px] shadow-xs shrink-0">
          <Sparkles className="w-3 h-3 text-indigo-200" />
          <span className="tracking-wide">DEMO RECREATION</span>
        </div>

        {/* Milestone Indicator */}
        <div className="hidden md:flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-slate-400 leading-tight">
            Reference Sequence
          </span>
          <span className="font-bold text-slate-800 text-[11px] leading-tight truncate max-w-[200px]">
            {sceneName}
          </span>
        </div>

        {/* Live Progress Bar & Timer */}
        <div className="flex items-center gap-2">
          <div className="w-20 sm:w-28 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80 shrink-0">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-[#4361ee] rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-semibold text-slate-600 shrink-0 w-14 text-right">
            {currentTime.toFixed(1)}s / 10s
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

        {/* Stop Action */}
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-xs transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
          title="Exit demo playback"
        >
          <Square className="w-3 h-3 fill-rose-600" />
          <span>Stop Demo</span>
        </button>
      </div>
    </aside>
  );
};
