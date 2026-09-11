import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown,
  Camera,
  Upload,
  ArrowRight,
  Lock,
  Activity,
  Database,
  Cpu,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';

interface MainDashboardProps {
  onConnectLiveClick?: () => void;
}

const QUICK_TARGETS = [
  { label: 'Bottle', emoji: '🍾' },
  { label: 'Backpack', emoji: '🎒' },
  { label: 'Laptop', emoji: '💻' },
  { label: 'Person', emoji: '👤' },
  { label: 'Suitcase', emoji: '🧳' },
  { label: 'Cell Phone', emoji: '📱' },
];

export const MainDashboard: React.FC<MainDashboardProps> = ({ onConnectLiveClick }) => {
  const { 
    setStage, 
    setActiveFeedTab, 
    startSearchFlow, 
    searchQuery,
    isAuthenticated,
    setShowAuthModal,
    currentUser,
    setShowOracleModal
  } = useExperienceStore();
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');

  const handleConnect = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (onConnectLiveClick) {
      onConnectLiveClick();
    } else {
      setActiveFeedTab('search');
      setStage('OBJECT_INPUT');
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent, targetOverride?: string) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    const query = (targetOverride !== undefined ? targetOverride : searchTerm).trim() || 'Bottle';
    startSearchFlow(query);
  };

  const handleQuickTargetClick = (target: string) => {
    setSearchTerm(target);
    handleSearchSubmit(undefined, target);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between select-none relative font-sans text-slate-800 animate-fade-in space-y-3">
      
      {/* 1. Sub-Header Workspace Breadcrumb & Live Telemetry Pills */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5 pt-0.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Workspace</span>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Surveillance Station
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-mono text-slate-600">
            <Activity className="w-3 h-3 text-indigo-500" />
            <span>60 FPS</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              setActiveFeedTab('cctv');
              setStage('HOME');
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/90 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs hover:bg-white hover:text-slate-900 transition-all cursor-pointer"
          >
            <Camera className="w-3 h-3 text-indigo-600" />
            <span>4 Cameras Live</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 2. SaaS KPI Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Active Cameras */}
        <div 
          onClick={() => {
            if (!isAuthenticated) {
              setShowAuthModal(true);
              return;
            }
            setActiveFeedTab('cctv');
          }}
          className="p-2.5 rounded-2xl bg-white/70 hover:bg-white/90 border border-slate-200/80 shadow-2xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>CCTV Streams</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              SYNC
            </span>
          </div>
          <div className="text-base font-extrabold text-slate-900 tracking-tight">
            4 / 4 Active
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            Overhead & Boundary
          </div>
        </div>

        {/* Metric 2: AI Vision Engine */}
        <div className="p-2.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Vision</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
              YOLOv8
            </span>
          </div>
          <div className="text-base font-extrabold text-slate-900 tracking-tight truncate">
            ByteTrack AI
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            COCO 80 Class Trajectory
          </div>
        </div>

        {/* Metric 3: Database Integrity */}
        <div 
          onClick={() => setShowOracleModal(true)}
          title="Inspect Oracle 21c Database"
          className="p-2.5 rounded-2xl bg-white/70 hover:bg-white/90 border border-slate-200/80 shadow-2xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Oracle 21c</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              ONLINE
            </span>
          </div>
          <div className="text-base font-extrabold text-slate-900 tracking-tight">
            SHA-256
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            Immutable Audit Ledger
          </div>
        </div>

        {/* Metric 4: Operator Access */}
        <div 
          onClick={() => {
            if (!isAuthenticated) {
              setShowAuthModal(true);
            } else {
              setActiveFeedTab('settings');
            }
          }}
          className="p-2.5 rounded-2xl bg-white/70 hover:bg-white/90 border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
              <span>Operator</span>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
              isAuthenticated 
                ? 'bg-violet-50 text-violet-700 border border-violet-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {isAuthenticated ? (currentUser?.role || 'AUTH') : 'GUEST'}
            </span>
          </div>
          <div className="text-base font-extrabold text-slate-900 tracking-tight truncate">
            {isAuthenticated && currentUser ? (currentUser.username || 'nikhil') : 'Sign In Required'}
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            {isAuthenticated ? 'RBAC Session Active' : 'Public Telemetry'}
          </div>
        </div>
      </div>

      {/* 3. Central Search & Command Center */}
      <div className="flex flex-col items-center justify-center py-2 space-y-3">
        {/* Brand Heading */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-baseline justify-center gap-1">
            <span>control</span>
            <span className="text-indigo-600 font-bold ml-1">f</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Spatial Object Search & Multi-Feed Video Telemetry
          </p>
        </div>

        {/* Video Search Pill Bar with Glassmorphic Finish */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-lg relative flex items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search target object (e.g. Bottle, Backpack, Laptop, Person)..."
            className="w-full pl-5 pr-28 py-2.5 rounded-full bg-white/95 border border-slate-200/90 shadow-sm text-xs placeholder:text-slate-400 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
          />
          <div className="absolute right-1.5 flex items-center gap-1.5">
            <button
              type="submit"
              title="Execute Spatial Object Search"
              className="px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Search className="w-3 h-3" />
              <span>Scan Feeds</span>
            </button>
          </div>
        </form>

        {/* Quick Target Suggestion Chips */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-lg">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Target:</span>
          {QUICK_TARGETS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleQuickTargetClick(item.label)}
              className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-slate-200/80 hover:border-indigo-300 text-[11px] font-medium text-slate-700 hover:text-indigo-600 shadow-2xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Authentication Notice if not signed in */}
        {!isAuthenticated && (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-indigo-50/90 border border-indigo-100 text-indigo-900 text-xs shadow-2xs animate-fade-in w-full max-w-lg">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-bold">Operator Login Required: </span>
              <span className="text-slate-600 text-[11px]">Sign in to launch spatial scans and command live CCTV cameras.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* 4. Primary SaaS Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Action 1: Upload Video Archive */}
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              setShowAuthModal(true);
              return;
            }
            setActiveFeedTab('upload');
            setStage('HOME');
          }}
          className="p-3.5 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-sm text-left transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-50 border border-slate-200/70 group-hover:border-indigo-100 flex items-center justify-center text-slate-700 group-hover:text-indigo-600 transition-colors shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">Upload Video Archive</span>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                  Offline
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                Process MP4/AVI recordings for trajectory reconstruction
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </button>

        {/* Action 2: Connect to Live CC Cam (Primary Highlight) */}
        <button
          id="connect-live-cctv-btn"
          type="button"
          onClick={handleConnect}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-[#4361ee] to-[#3a56d4] hover:from-[#3a56d4] hover:to-[#2e46be] text-white shadow-md shadow-indigo-200/60 hover:shadow-indigo-300/80 text-left transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-xs sm:text-sm">Connect to Live CC Cam</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/25 text-white">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 font-medium line-clamp-1 mt-0.5">
                Stream real-time overhead camera feeds with bounding boxes
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
        </button>
      </div>

      {/* 5. Telemetry & Surveillance System Status Footer */}
      <div className="space-y-2 pt-2 border-t border-slate-200/70">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Surveillance Feeds & Audit Trail</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              setActiveFeedTab('cctv');
            }}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Feeds</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-12 gap-2.5 items-center text-xs text-slate-700">
          {/* Stream 01 Status Tile */}
          <div
            onClick={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              setActiveFeedTab('cctv');
            }}
            className="col-span-12 sm:col-span-6 flex items-center justify-between p-2 rounded-xl bg-white/70 hover:bg-white border border-slate-200/80 shadow-2xs cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="font-bold text-slate-800 text-[11px] block">CCTV Stream 01 (Overhead)</span>
                <span className="text-[10px] text-slate-400 font-mono">1080p @ 30fps • 4.2 Mbps</span>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              ONLINE
            </span>
          </div>

          {/* Audit Logs Quick Link */}
          <div
            onClick={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              setActiveFeedTab('logs');
            }}
            className="col-span-12 sm:col-span-6 flex items-center justify-between p-2 rounded-xl bg-white/70 hover:bg-white border border-slate-200/80 shadow-2xs cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <div>
                <span className="font-bold text-slate-800 text-[11px] block">Oracle Audit Trail</span>
                <span className="text-[10px] text-slate-400 font-medium">Genesis Chain Active</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
              <span>Inspect Logs</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};


