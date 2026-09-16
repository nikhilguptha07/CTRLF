import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  Search, 
  Camera, 
  ArrowRight, 
  Lock, 
  RefreshCw, 
  FolderSearch, 
  History, 
  AlertTriangle,
  Radio,
  Sliders,
  Network,
  Eye,
  Crosshair,
  Activity,
  ChevronRight,
  Database
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';
import { 
  CameraNetwork3D, 
  DEFAULT_CAMERA_NODES 
} from '../../components/three/CameraNetwork3D';
import { 
  fetchCommandCenterData, 
  DEFAULT_COMMAND_CENTER_DATA 
} from '../../services/commandCenterService';
import type { 
  CommandCenterPayload, 
  ActiveInvestigation, 
  RecentDetection 
} from '../../types/commandCenter';

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
    setShowOracleModal,
    openInvestigation
  } = useExperienceStore();

  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  const [data, setData] = useState<CommandCenterPayload>(DEFAULT_COMMAND_CENTER_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected camera node in the 3D network
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM-12');
  const selectedCameraData = DEFAULT_CAMERA_NODES.find((n) => n.id === selectedCameraId) || DEFAULT_CAMERA_NODES[0];

  // Live telemetry clock
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    return new Date().toTimeString().split(' ')[0] + ' UTC';
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toTimeString().split(' ')[0] + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch command center data
  const loadData = useCallback(async (_showFullLoader: boolean = false) => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const payload = await fetchCommandCenterData();
      setData(payload);
    } catch (err: any) {
      console.warn('[MainDashboard] Telemetry sync notice:', err);
      setErrorMessage('Operating on cached telemetry. Offline resilience active.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Primary Action: Find an Object
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

  // Secondary Action 1: Live Cameras
  const handleLiveCameras = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (onConnectLiveClick) {
      onConnectLiveClick();
    } else {
      setActiveFeedTab('cctv');
      setStage('HOME');
    }
  };

  // Secondary Action 2: Investigations
  const handleInvestigations = () => {
    openInvestigation();
  };

  // Secondary Action 3: Detection History
  const handleDetectionHistory = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActiveFeedTab('history');
  };

  const handleSelectCase = (caseItem: ActiveInvestigation) => {
    openInvestigation(caseItem.caseId);
  };

  const handleSelectDetection = (detection: RecentDetection) => {
    setSearchTerm(detection.object);
    handleSearchSubmit(undefined, detection.object);
  };

  const activeAlertCount = data.alerts.filter((a) => !a.resolved).length;

  return (
    <div className="w-full flex flex-col select-none relative font-sans text-slate-100 animate-fade-in space-y-4 pb-6">
      
      {/* 1. OPERATIONAL COMMAND HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#162032] pb-2.5 pt-0.5 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-500 font-mono">WORKSPACE</span>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wider uppercase font-sans">
            <Radio className="w-3.5 h-3.5 text-[#00e5ff] animate-pulse" />
            <span>COMMAND CENTER</span>
          </div>
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#101726] border border-[#1d2a42] text-cyan-400">
            STATION 01
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Status Indicator Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d1624] border border-[#1b2c45] text-[10px] font-mono font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-300">SYSTEM STATUS:</span>
            <span className="text-emerald-400">OPERATIONAL</span>
          </div>

          {/* Attention Required Badge if any alerts */}
          {activeAlertCount > 0 && (
            <div 
              onClick={() => setActiveFeedTab('alerts')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold cursor-pointer hover:bg-rose-500/20 transition-colors"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{activeAlertCount} ALERTS</span>
            </div>
          )}

          {/* Clock */}
          <div className="px-2.5 py-1 rounded-lg bg-[#0e1624] border border-[#1a2940] text-[10px] font-mono text-slate-300 hidden md:block">
            {currentTimeStr}
          </div>

          {/* Refresh Telemetry */}
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-[#0e1624] hover:bg-[#142236] border border-[#1a2940] text-slate-300 hover:text-white transition-all cursor-pointer shadow-inner"
            title="Refresh Command Center Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00e5ff]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state banner if any */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between font-mono animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="underline font-bold text-amber-200 hover:text-white text-[11px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. HERO AREA: SECURITY NETWORK SPATIAL COMMAND */}
      <div className="soc-panel p-4 rounded-xl border border-[#18263c] bg-[#0c121d] relative overflow-hidden shadow-2xl">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid-technical opacity-20 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column (5 cols): Security Network Telemetry & Selected Camera */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#00e5ff]" />
                  <h2 className="text-xs font-mono font-extrabold uppercase tracking-widest text-white">
                    SECURITY NETWORK
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30">
                  SPATIAL FABRIC ACTIVE
                </span>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed font-sans mb-3">
                Live surveillance mesh monitoring physical facilities. Connected camera nodes stream telemetry to the real-time vision inference engine.
              </p>

              {/* Quick Network Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#080d15] border border-[#162234]">
                  <div className="text-[10px] text-slate-400 uppercase">Total Cameras</div>
                  <div className="text-base font-extrabold text-white mt-0.5">48</div>
                  <div className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    46 ONLINE
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080d15] border border-[#162234]">
                  <div className="text-[10px] text-slate-400 uppercase">Offline Nodes</div>
                  <div className="text-base font-extrabold text-rose-400 mt-0.5">02</div>
                  <div className="text-[9px] text-rose-400 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    CAM-04 OFFLINE
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080d15] border border-[#162234] col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400 uppercase">Active Cases</div>
                  <div className="text-base font-extrabold text-[#00e5ff] mt-0.5">07</div>
                  <div className="text-[9px] text-cyan-400 font-semibold mt-0.5">
                    03 PROCESSING
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Camera Inspection Card */}
            <div className="p-3 rounded-xl bg-[#090e17] border border-[#1a283e] relative shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-[#141f30] text-xs">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span className="font-mono font-bold text-white text-xs">
                    NODE INSPECTOR: <span className="text-[#00e5ff]">{selectedCameraData.id}</span>
                  </span>
                </div>
                <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold border ${
                  selectedCameraData.status === 'ONLINE'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : selectedCameraData.status === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {selectedCameraData.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Name</span>
                  <span className="text-slate-200 font-semibold truncate block">{selectedCameraData.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Location</span>
                  <span className="text-slate-200 font-semibold truncate block">{selectedCameraData.location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Resolution</span>
                  <span className="text-slate-300 block">{selectedCameraData.resolution}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Stream FPS</span>
                  <span className="text-slate-300 block">{selectedCameraData.fps.toFixed(1)} FPS</span>
                </div>
              </div>

              {/* Node selector tabs */}
              <div className="flex items-center gap-1.5 pt-3 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-mono text-slate-500 shrink-0">Nodes:</span>
                {DEFAULT_CAMERA_NODES.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedCameraId(node.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCameraId === node.id
                        ? 'bg-[#00e5ff] text-[#080b11] shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                        : 'bg-[#101726] text-slate-400 hover:text-white border border-[#182438]'
                    }`}
                  >
                    {node.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Interactive 3D Camera Network Canvas */}
          <div className="lg:col-span-7 h-64 sm:h-72 lg:h-80 rounded-xl bg-[#070a10] border border-[#18263c] relative overflow-hidden flex flex-col">
            {/* Viewport Header Controls */}
            <div className="absolute top-2.5 left-3 z-10 flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-ping" />
              <span className="text-[10px] font-mono font-bold text-cyan-300 tracking-wider">
                3D SPATIAL NETWORK VIEW
              </span>
            </div>

            {/* Status Legend Overlay */}
            <div className="absolute bottom-2.5 right-3 z-10 flex items-center gap-3 px-2.5 py-1 rounded-lg bg-[#0a0f18]/80 backdrop-blur-md border border-[#1a283e] text-[9px] font-mono text-slate-300 pointer-events-none">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                <span>ONLINE</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>WARN</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>OFFLINE</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>PATH</span>
              </div>
            </div>

            {/* React Three Fiber Canvas with CameraNetwork3D */}
            <div className="w-full h-full cursor-grab active:cursor-grabbing">
              <Canvas
                camera={{ position: [0, 5, 8], fov: 42 }}
                gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
                dpr={[1, 1.5]}
              >
                <color attach="background" args={['#070a10']} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 10, 5]} intensity={0.8} />
                <Suspense fallback={null}>
                  <CameraNetwork3D
                    mode="hero"
                    selectedCameraId={selectedCameraId}
                    onSelectCamera={(id) => setSelectedCameraId(id)}
                    activePath={['CAM-07', 'CAM-12', 'CAM-18']}
                  />
                </Suspense>
              </Canvas>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY ACTION: FIND AN OBJECT */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#0d1624] via-[#0f1b2c] to-[#0d1624] border border-[#1e304c] text-white shadow-xl relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-[#00e5ff]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 text-[9px] font-mono font-extrabold uppercase tracking-wider">
                PRIMARY ACTION
              </span>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight uppercase font-sans text-white">
                FIND AN OBJECT
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Search across your connected camera network using natural language descriptors or deep visual targets.
            </p>

            <form onSubmit={handleSearchSubmit} className="relative flex items-center pt-1">
              <div className="absolute left-3 text-cyan-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="command-center-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="What are you looking for? (e.g. Black backpack, red bottle, laptop, person)..."
                className="w-full pl-9 pr-36 py-2.5 rounded-lg bg-[#080d15] border border-[#213552] text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-[#00e5ff] focus:border-[#00e5ff] transition-all font-sans"
              />
              <button
                type="submit"
                id="command-center-scan-btn"
                className="absolute right-1 px-4 py-1.5 bg-[#00e5ff] hover:bg-[#00cce6] text-[#080b11] font-extrabold text-xs rounded-md shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>START SEARCH</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Target Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-mono text-slate-400">Quick Target:</span>
              {QUICK_TARGETS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleQuickTargetClick(item.label)}
                  className="px-2 py-0.5 rounded bg-[#131d2d] hover:bg-[#1b2a40] text-slate-200 border border-[#20324c] text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Quick Action Buttons */}
          <div className="flex md:flex-col gap-2 justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-[#1a2940] md:pl-5">
            <button
              type="button"
              id="action-live-cameras"
              onClick={handleLiveCameras}
              className="flex-1 md:flex-none px-3.5 py-2 rounded-lg bg-[#111a28] hover:bg-[#18253a] border border-[#20324c] text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer shadow-xs group"
            >
              <Camera className="w-4 h-4 text-emerald-400 group-hover:scale-105 transition-transform" />
              <span>LIVE CCTV FEEDS</span>
            </button>

            <button
              type="button"
              id="action-investigations"
              onClick={handleInvestigations}
              className="flex-1 md:flex-none px-3.5 py-2 rounded-lg bg-[#111a28] hover:bg-[#18253a] border border-[#20324c] text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer shadow-xs group"
            >
              <FolderSearch className="w-4 h-4 text-[#00e5ff] group-hover:scale-105 transition-transform" />
              <span>INVESTIGATIONS</span>
            </button>

            <button
              type="button"
              id="action-detection-history"
              onClick={handleDetectionHistory}
              className="flex-1 md:flex-none px-3.5 py-2 rounded-lg bg-[#111a28] hover:bg-[#18253a] border border-[#20324c] text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer shadow-xs group"
            >
              <History className="w-4 h-4 text-blue-400 group-hover:scale-105 transition-transform" />
              <span>DETECTION LOGS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auth Gate Notification for Unauthenticated Viewers */}
      {!isAuthenticated && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0f1726] border border-[#1e2f49] text-slate-200 text-xs animate-fade-in shadow-inner">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-[#00e5ff] shrink-0" />
            <div>
              <span className="font-bold text-white">Operator Authentication Recommended: </span>
              <span className="text-slate-400 text-[11px]">Sign in for continuous real-time PTZ control and evidence hashing.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="px-3 py-1 bg-[#00e5ff] hover:bg-[#00cce6] text-[#080b11] rounded-md text-xs font-extrabold cursor-pointer shadow-xs transition-colors shrink-0"
          >
            Sign In
          </button>
        </div>
      )}

      {/* 4. OPERATIONAL METRICS */}
      <div>
        <div className="flex items-center justify-between pb-2 text-xs">
          <div className="flex items-center gap-2 font-mono font-bold text-slate-300 uppercase">
            <Sliders className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span>Operational Telemetry & System Diagnostics</span>
          </div>
          <button
            type="button"
            onClick={() => setShowOracleModal(true)}
            className="text-[11px] font-mono text-[#00e5ff] hover:underline cursor-pointer font-medium flex items-center gap-1"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Oracle 21c Database Inspector →</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs font-mono">
          {/* Card 1: Cameras */}
          <div 
            onClick={handleLiveCameras}
            className="p-3 rounded-xl bg-[#0c121d] border border-[#1a273c] hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>CAMERAS</span>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-white">48</span>
              <span className="text-[10px] text-emerald-400 font-bold">46 ONLINE</span>
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              02 Perimeter Offline
            </div>
          </div>

          {/* Card 2: Active Investigations */}
          <div 
            onClick={handleInvestigations}
            className="p-3 rounded-xl bg-[#0c121d] border border-[#1a273c] hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <div className="flex items-center gap-1.5">
                <FolderSearch className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>INVESTIGATIONS</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00e5ff]/20 text-[#00e5ff]">ACTIVE</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-white">07</span>
              <span className="text-[10px] text-cyan-400 font-bold">CASES</span>
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              3 Under AI Sweep
            </div>
          </div>

          {/* Card 3: Processing */}
          <div className="p-3 rounded-xl bg-[#0c121d] border border-[#1a273c] flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>PROCESSING</span>
              </div>
              <span className="text-[9px] text-indigo-300">GPU ACCEL</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-indigo-300">03</span>
              <span className="text-[10px] text-slate-400">PIPELINES</span>
            </div>
            <div className="text-[9px] text-emerald-400 truncate">
              YOLOv8 ByteTrack Lock
            </div>
          </div>

          {/* Card 4: Detections Today */}
          <div 
            onClick={handleDetectionHistory}
            className="p-3 rounded-xl bg-[#0c121d] border border-[#1a273c] hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>DETECTIONS</span>
              </div>
              <span className="text-[9px] text-slate-400">TODAY</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-white">184</span>
              <span className="text-[10px] text-slate-400">EVENTS</span>
            </div>
            <div className="text-[9px] text-emerald-400 truncate">
              98.2% Precision Score
            </div>
          </div>

          {/* Card 5: Alerts */}
          <div 
            onClick={() => setActiveFeedTab('alerts')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeAlertCount > 0
                ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-400'
                : 'bg-[#0c121d] border-[#1a273c] hover:border-cyan-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 ${activeAlertCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>ALERTS</span>
              </div>
              {activeAlertCount > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                  WARN
                </span>
              )}
            </div>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className={`text-xl font-extrabold ${activeAlertCount > 0 ? 'text-rose-300' : 'text-white'}`}>
                {activeAlertCount < 10 ? `0${activeAlertCount}` : activeAlertCount}
              </span>
              <span className="text-[10px] text-slate-400">UNRESOLVED</span>
            </div>
            <div className={`text-[9px] truncate ${activeAlertCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
              {activeAlertCount > 0 ? 'CAM-04 Connection Loss' : 'All Feeds Clear'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. OPERATIONAL TWO-COLUMN COMMAND PANELS: ACTIVE INVESTIGATIONS & RECENT DETECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
        {/* Left Column (6 cols): Active Investigations Stream */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="soc-panel rounded-xl border border-[#18263c] bg-[#0c121d] p-3.5 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#162134] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <FolderSearch className="w-4 h-4 text-[#00e5ff]" />
                <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider text-white">
                  ACTIVE INVESTIGATIONS
                </h2>
                <span className="px-2 py-0.2 rounded text-[9px] font-mono font-bold bg-[#142033] text-cyan-300 border border-[#1d2d46]">
                  {data.investigations.length} CASES
                </span>
              </div>
              <button
                type="button"
                onClick={handleInvestigations}
                className="text-[11px] font-mono text-[#00e5ff] hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
              >
                <span>All Cases</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Investigation items */}
            <div className="space-y-2.5 flex-1">
              {data.investigations.map((item) => (
                <div
                  key={item.caseId}
                  onClick={() => handleSelectCase(item)}
                  className="p-3 rounded-lg bg-[#080d15] border border-[#18263c] hover:border-[#00e5ff]/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white group-hover:text-[#00e5ff] transition-colors">
                        {item.caseId}
                      </span>
                      <span className="text-slate-400 font-sans font-bold">
                        {item.targetObject || item.object}
                      </span>
                    </div>
                    <span className={`px-2 py-0.2 rounded text-[9px] font-bold border ${
                      item.status === 'SEARCHING'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : item.status === 'ANALYZING'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 mt-2">
                    <div>
                      <span className="text-slate-500 block">CAMERAS</span>
                      <span className="text-slate-200 font-bold">{item.camerasSearched ?? 12} Feeds</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">MATCHES</span>
                      <span className="text-[#00e5ff] font-bold">{item.matchesFound ?? 4} Verified</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">LAST DETECTION</span>
                      <span className="text-slate-200 truncate block">
                        {item.lastDetection || `${item.camera} · ${item.lastDetectedTime}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-[#121c2c]">
                    <span>Started: {item.startedAt || item.lastDetectedTime || '14:15:00'}</span>
                    <span className="text-[#00e5ff] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                      Open Investigation →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (6 cols): Recent Evidence Detections Feed */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="soc-panel rounded-xl border border-[#18263c] bg-[#0c121d] p-3.5 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#162134] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider text-white">
                  RECENT DETECTIONS
                </h2>
                <span className="px-2 py-0.2 rounded text-[9px] font-mono font-bold bg-[#142033] text-emerald-400 border border-[#1d2d46]">
                  EVIDENCE FEED
                </span>
              </div>
              <button
                type="button"
                onClick={handleDetectionHistory}
                className="text-[11px] font-mono text-[#00e5ff] hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
              >
                <span>Detection Logs</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Evidence detection cards */}
            <div className="space-y-2 flex-1">
              {data.recentDetections.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectDetection(item)}
                  className="p-2.5 rounded-lg bg-[#080d15] border border-[#18263c] hover:border-emerald-500/50 transition-all cursor-pointer flex items-center gap-3 group"
                >
                  {/* Thumbnail / Evidence frame */}
                  <div className="w-16 h-12 rounded bg-[#0e1624] border border-[#1e2d44] overflow-hidden shrink-0 relative">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.object}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 border border-emerald-400/40 pointer-events-none" />
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-extrabold text-white group-hover:text-emerald-300 transition-colors uppercase">
                        {item.object}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                        item.status === 'CONFIRMED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 mt-1">
                      <span className="text-[#00e5ff] font-bold">{item.camera}</span>
                      <span className="text-slate-500">•</span>
                      <span className="truncate">{item.location}</span>
                      <span className="text-slate-500">•</span>
                      <span>{item.timestamp}</span>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-xs font-extrabold text-emerald-400 block">
                      {item.confidence}%
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase">Match</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

