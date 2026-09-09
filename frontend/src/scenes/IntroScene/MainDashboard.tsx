import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown,
  Camera,
  Upload,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';

interface MainDashboardProps {
  onConnectLiveClick?: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ onConnectLiveClick }) => {
  const { setStage, setActiveFeedTab, startSearchFlow, searchQuery } = useExperienceStore();
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');

  const handleConnect = () => {
    if (onConnectLiveClick) {
      onConnectLiveClick();
    } else {
      setActiveFeedTab('search');
      setStage('OBJECT_INPUT');
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim() || 'Bottle';
    startSearchFlow(query);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between select-none relative font-sans text-slate-800 animate-fade-in">
      
      {/* 1. Sub-Header Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 pt-1 text-xs">
        <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveFeedTab('home'); setStage('HOME'); }}
            className="font-bold text-slate-900 border-b-2 border-indigo-600 pb-3.5 -mb-3.5 px-0.5 tracking-tight transition-all"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => { setActiveFeedTab('search'); setStage('OBJECT_INPUT'); }}
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 font-medium"
          >
            <span>Objects</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveFeedTab('cctv'); setStage('HOME'); }}
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 font-medium"
          >
            <Camera className="w-3 h-3 text-slate-400" />
            <span>Cameras</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveFeedTab('heatmaps'); setStage('HOME'); }}
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 font-medium"
          >
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Spatial Map</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveFeedTab('logs'); setStage('HOME'); }}
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 font-medium"
          >
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Audit Logs</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => { setActiveFeedTab('cctv'); setStage('HOME'); }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs hover:bg-white hover:text-slate-900 transition-all cursor-pointer"
        >
          <span>All Cameras (4)</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* 2. Main Central Section */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 sm:my-4 space-y-5">
        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1">
          <span>control</span>
          <span className="text-indigo-600 font-bold ml-1.5">f</span>
        </h1>

        {/* Video Search Pill Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-md relative flex items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for object (e.g. Bottle, Backpack, Laptop, Person)..."
            className="w-full pl-5 pr-12 py-2.5 rounded-full bg-white/95 border border-slate-200/90 shadow-sm text-xs placeholder:text-slate-400 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            type="submit"
            title="Start Search"
            className="absolute right-1.5 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Action Buttons: Upload Video & Connect to Live CC Cam */}
        <div className="flex items-center gap-3 sm:gap-5 pt-1">
          <button
            type="button"
            onClick={() => { setActiveFeedTab('upload'); setStage('HOME'); }}
            className="px-6 sm:px-7 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold shadow-sm border border-slate-200/80 hover:shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Upload Video</span>
          </button>

          <button
            id="connect-live-cctv-btn"
            type="button"
            onClick={handleConnect}
            className="px-6 sm:px-7 py-3 rounded-2xl bg-[#4361ee] hover:bg-[#3854d9] text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-200/50 hover:shadow-indigo-300/60 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>Connect to Live CC Cam</span>
          </button>
        </div>



        {/* Indicator Dots with interactive navigation */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            title="Overview"
            onClick={() => setActiveFeedTab('home')}
            className="w-2 h-2 rounded-full bg-indigo-600 cursor-pointer"
          />
          <button
            type="button"
            title="CCTV Feeds"
            onClick={() => setActiveFeedTab('cctv')}
            className="w-2 h-2 rounded-full bg-slate-300 hover:bg-indigo-400 cursor-pointer transition-colors"
          />
          <button
            type="button"
            title="Spatial Heatmap"
            onClick={() => setActiveFeedTab('heatmaps')}
            className="w-2 h-2 rounded-full bg-slate-300 hover:bg-indigo-400 cursor-pointer transition-colors"
          />
          <button
            type="button"
            title="Footage Upload"
            onClick={() => setActiveFeedTab('upload')}
            className="w-2 h-2 rounded-full bg-slate-300 hover:bg-indigo-400 cursor-pointer transition-colors"
          />
          <button
            type="button"
            title="Audit Logs"
            onClick={() => setActiveFeedTab('logs')}
            className="w-2 h-2 rounded-full bg-slate-300 hover:bg-indigo-400 cursor-pointer transition-colors"
          />
        </div>
      </div>

      {/* 3. Bottom Table Section */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Surveillance System Status</span>
          <button
            type="button"
            onClick={() => setActiveFeedTab('cctv')}
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
          >
            <span>View all 4 feeds</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-12 gap-3 items-center text-xs text-slate-700">
          <div
            onClick={() => setActiveFeedTab('cctv')}
            className="col-span-6 flex items-center justify-between p-2.5 rounded-xl bg-white/70 hover:bg-white border border-slate-200/80 shadow-2xs cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-800">CCTV Stream 01 (Overhead)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              ONLINE
            </span>
          </div>
          <div
            onClick={() => setActiveFeedTab('logs')}
            className="col-span-6 flex items-center justify-between p-2.5 rounded-xl bg-white/70 hover:bg-white border border-slate-200/80 shadow-2xs cursor-pointer transition-all"
          >
            <span className="text-slate-600 font-medium">Audit Trail</span>
            <span className="font-mono text-indigo-600 font-bold hover:underline">
              View Database Records &rarr;
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

