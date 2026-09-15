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
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 pt-0.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Workspace</span>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Surveillance Station
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-mono text-slate-600">
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
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-2xs hover:border-slate-300 hover:text-slate-950 transition-all cursor-pointer"
          >
            <Camera className="w-3 h-3 text-indigo-600" />
            <span>4 Cameras Live</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 2. Enterprise Metric Tiles */}
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
          className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>CCTV Streams</span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              SYNC
            </span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight font-sans">
            4 / 4 Active
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5 font-mono">
            Overhead & Perimeter
          </div>
        </div>

        {/* Metric 2: AI Vision Engine */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Engine</span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
              YOLOv8
            </span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight font-sans truncate">
            ByteTrack AI
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5 font-mono">
            80-Class Spatial Tracking
          </div>
        </div>

        {/* Metric 3: Database Integrity */}
        <div 
          onClick={() => setShowOracleModal(true)}
          title="Inspect Oracle 21c Database"
          className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Oracle 21c</span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              ONLINE
            </span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight font-mono">
            SHA-256
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5 font-mono">
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
          className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Operator</span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
              isAuthenticated 
                ? 'bg-slate-100 text-slate-800 border border-slate-200' 
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {isAuthenticated ? (currentUser?.role || 'AUTH') : 'GUEST'}
            </span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight truncate font-sans">
            {isAuthenticated && currentUser ? (currentUser.username || 'nikhil') : 'Sign In Required'}
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5 font-mono">
            {isAuthenticated ? 'RBAC Session Active' : 'Public Telemetry'}
          </div>
        </div>
      </div>

      {/* 3. Central Search & Command Center */}
      <div className="flex flex-col items-center justify-center py-2 space-y-3">
        {/* Brand Heading */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-baseline justify-center gap-1 font-sans">
            <span>CONTROL</span>
            <span className="text-indigo-600 font-bold ml-0.5">F</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 font-mono">
            Physical-World Spatial Object Search & Surveillance Telemetry
          </p>
        </div>

        {/* Object Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-lg relative flex items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search target object (e.g. Bottle, Backpack, Laptop, Person)..."
            className="w-full pl-4 pr-28 py-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs placeholder:text-slate-400 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
          />
          <div className="absolute right-1.5 flex items-center gap-1.5">
            <button
              type="submit"
              title="Execute Spatial Object Search"
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 rounded-lg shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <Search className="w-3 h-3" />
              <span>Scan Feeds</span>
            </button>
          </div>
        </form>

        {/* Quick Target Suggestion Chips */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-lg">
          <span className="text-[11px] text-slate-400 font-medium mr-1 font-mono">Quick Target:</span>
          {QUICK_TARGETS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleQuickTargetClick(item.label)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-[11px] font-medium text-slate-700 shadow-2xs rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Authentication Notice if not signed in */}
        {!isAuthenticated && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs shadow-2xs animate-fade-in w-full max-w-lg">
            <Lock className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-bold">Operator Session Required: </span>
              <span className="text-slate-600 text-[11px]">Sign in to launch spatial scans and command CCTV cameras.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] rounded-md transition-colors cursor-pointer shrink-0"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* 4. Primary Action Cards */}
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
          className="p-3.5 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 shadow-2xs text-left transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200/70 border border-slate-200/70 flex items-center justify-center text-slate-700 transition-colors shrink-0">
              <Upload className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">Upload Video Footage</span>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600">
                  Ingest
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                Process recordings for object search & trajectory tracking
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </button>

        {/* Action 2: Connect to Live CC Cam */}
        <button
          id="connect-live-cctv-btn"
          type="button"
          onClick={handleConnect}
          className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs text-left transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <Camera className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-xs sm:text-sm">Connect to Live CCTV</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium line-clamp-1 mt-0.5">
                Real-time overhead camera feeds with YOLOv8 inference
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
        </button>
      </div>

      {/* 5. Telemetry & Surveillance System Status Footer */}
      <div className="space-y-2 pt-2 border-t border-slate-200/80">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
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
            className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
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
            className="col-span-12 sm:col-span-6 flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
              setActiveFeedTab('history');
            }}
            className="col-span-12 sm:col-span-6 flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-700" />
              <div>
                <span className="font-bold text-slate-800 text-[11px] block">Oracle Audit Trail</span>
                <span className="text-[10px] text-slate-400 font-mono">Immutable Log Ledger</span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-0.5">
              <span>Detection History</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
