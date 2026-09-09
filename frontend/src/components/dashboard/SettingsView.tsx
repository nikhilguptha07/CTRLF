import React from 'react';
import { Volume2, VolumeX, Sliders, Shield, Eye } from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';

export const SettingsView: React.FC = () => {
  const { soundEnabled, toggleSound, volume, setVolume } = useExperienceStore();
  const [confidenceScore, setConfidenceScore] = React.useState(90);
  const [securityActive, setSecurityActive] = React.useState(true);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 my-auto py-4 animate-fade-in">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">System Preferences</h2>
        <p className="text-xs text-slate-500">
          Configure surveillance audio, AI inference confidence thresholds, and video rendering settings.
        </p>
      </div>

      <div className="space-y-4">
        {/* Sound & Audio Architecture */}
        <div className="p-4 rounded-2xl bg-white/60 border border-white/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-900 text-white">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Surveillance Audio Engine</h3>
                <p className="text-[11px] text-slate-500">Web Audio API motor servos, alerts, and ambient radar pings.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                soundEnabled
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {soundEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          {/* Master Volume Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Master Sound Volume</span>
              <span className="font-mono font-semibold text-slate-900">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
          </div>
        </div>

        {/* AI Model Parameters */}
        <div className="p-4 rounded-2xl bg-white/60 border border-white/80 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Detection Sensitivity</h3>
              <p className="text-[11px] text-slate-500">Confidence threshold for optical match validation.</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Minimum Confidence Score</span>
              <span className="font-mono text-emerald-700 font-semibold">{confidenceScore}.0%</span>
            </div>
            <input
              type="range"
              min="75"
              max="99"
              value={confidenceScore}
              onChange={(e) => setConfidenceScore(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        {/* Security & Encryption */}
        <div className="p-4 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Local Zero-Knowledge Inference</h3>
              <p className="text-[11px] text-slate-500">Camera telemetry is processed locally without cloud upload.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSecurityActive(prev => !prev)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              securityActive ? 'text-emerald-700 bg-emerald-100' : 'text-slate-600 bg-slate-200'
            }`}
          >
            {securityActive ? 'ACTIVE' : 'OFFLINE'}
          </button>
        </div>

        {/* High Performance Mode */}
        <div className="p-4 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600 text-white">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Physical PBR Camera Shaders</h3>
              <p className="text-[11px] text-slate-500">ACES Filmic tone mapping with 3D volumetric noise cone.</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
            60 FPS
          </span>
        </div>
      </div>
    </div>
  );
};
