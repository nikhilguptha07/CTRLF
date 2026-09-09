import React from 'react';
import { Layers, Navigation, Activity } from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';

export const SpatialHeatmap: React.FC = () => {
  const { searchQuery, startSearchFlow, searchSession } = useExperienceStore();

  const zones = [
    { name: 'Zone 01: North Reception', density: 'Unmonitored', prob: 'N/A', color: 'bg-slate-800/40 border-slate-700 text-slate-400' },
    { name: 'Zone 02: Central Corridor', density: 'Unmonitored', prob: 'N/A', color: 'bg-slate-800/40 border-slate-700 text-slate-400' },
    { name: 'Zone 03: Executive Lounge', density: 'Unmonitored', prob: 'N/A', color: 'bg-slate-800/40 border-slate-700 text-slate-400' },
    { name: 'Zone 04: South Entrance (CAM-01 Active)', density: searchSession.status === 'DETECTED' ? 'Target Verified' : 'Scanning Grid', prob: searchSession.status === 'DETECTED' ? 'CONFIRMED' : 'N/A', color: searchSession.status === 'DETECTED' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
  ];

  return (
    <div className="space-y-4 animate-fade-in w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Facility Spatial Heatmap</span>
          </h2>
          <p className="text-xs text-slate-500">
            Spatial distribution map for target <span className="font-semibold text-slate-800">"{searchQuery || 'Unspecified'}"</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {searchSession.trackId ? (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              TRACKING: #{searchSession.trackId} ACTIVE (ByteTrack)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              BYTETRACK READY
            </span>
          )}
        </div>
      </div>

      {/* Main Interactive Floorplan Map */}
      <div className="relative flex-1 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden p-6 flex flex-col justify-between shadow-inner">
        {/* Architectural grid lines */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Top Info Banner */}
        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>FACILITY_LEVEL_01 // SECTORS</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Navigation className="w-3.5 h-3.5" />
            MULTI-CAM SPATIAL TRACKING PENDING
          </span>
        </div>

        {/* Zones Layout */}
        <div className="relative z-10 grid grid-cols-2 gap-4 my-auto">
          {zones.map((zone) => (
            <div
              key={zone.name}
              className={`p-4 rounded-xl border backdrop-blur-md transition-all flex flex-col justify-between ${zone.color}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold">{zone.name}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {zone.prob}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                <span>Density: {zone.density}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Strip */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
          <span>Spatial coordinate heatmap requires multi-camera tracking integration</span>
          <button
            type="button"
            onClick={() => startSearchFlow(searchQuery || 'Keys')}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Launch 3D Camera Search &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
