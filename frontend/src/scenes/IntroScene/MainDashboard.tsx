import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Camera, 
  ArrowRight, 
  Lock, 
  RefreshCw, 
  FolderSearch, 
  History, 
  ShieldCheck, 
  AlertTriangle,
  Radio,
  Sliders
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';
import { SystemStatusGrid } from '../../components/dashboard/SystemStatusGrid';
import { ActiveInvestigations } from '../../components/dashboard/ActiveInvestigations';
import { RecentDetectionsFeed } from '../../components/dashboard/RecentDetectionsFeed';
import { SecurityAlertsPanel } from '../../components/dashboard/SecurityAlertsPanel';
import { 
  fetchCommandCenterData, 
  DEFAULT_COMMAND_CENTER_DATA 
} from '../../services/commandCenterService';
import type { 
  CommandCenterPayload, 
  ActiveInvestigation, 
  RecentDetection, 
  SecurityAlert 
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
    setShowOracleModal
  } = useExperienceStore();

  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  const [data, setData] = useState<CommandCenterPayload>(DEFAULT_COMMAND_CENTER_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const loadData = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) setIsLoading(true);
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const payload = await fetchCommandCenterData();
      setData(payload);
    } catch (err: any) {
      console.warn('[MainDashboard] Telemetry sync notice:', err);
      setErrorMessage('Operating on cached telemetry. Offline resilience active.');
    } finally {
      setIsLoading(false);
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
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActiveFeedTab('history');
  };

  // Secondary Action 3: Detection History
  const handleDetectionHistory = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActiveFeedTab('history');
  };

  // Alert actions
  const handleAlertAction = (alert: SecurityAlert) => {
    if (alert.type === 'CAMERA_OFFLINE') {
      handleLiveCameras();
    } else if (alert.type === 'REVIEW_REQUIRED') {
      handleDetectionHistory();
    } else if (alert.type === 'SYSTEM_WARNING') {
      setShowOracleModal(true);
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setData((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)),
    }));
  };

  // Selected investigation click
  const handleSelectCase = (caseItem: ActiveInvestigation) => {
    setSearchTerm(caseItem.object);
    handleSearchSubmit(undefined, caseItem.object);
  };

  // Selected detection click
  const handleSelectDetection = (detection: RecentDetection) => {
    setSearchTerm(detection.object);
    handleSearchSubmit(undefined, detection.object);
  };

  const activeAlertCount = data.alerts.filter((a) => !a.resolved).length;

  return (
    <div className="w-full flex flex-col select-none relative font-sans text-slate-800 animate-fade-in space-y-3 pb-2">
      
      {/* 1. Operational Command Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 pt-0.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 font-mono">WORKSPACE</span>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 tracking-tight font-sans">
            <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>COMMAND CENTER CONSOLE</span>
          </div>
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-600">
            STATION 01
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Status Indicator Pill */}
          {activeAlertCount > 0 ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-mono font-bold">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>{activeAlertCount} ATTENTION REQUIRED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>SYSTEM FULLY OPERATIONAL</span>
            </div>
          )}

          {/* Clock */}
          <div className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600 hidden md:block">
            {currentTimeStr}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
            title="Refresh Command Center Telemetry"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state banner if any */}
      {errorMessage && (
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between font-mono animate-fade-in">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="underline font-bold text-amber-950 hover:text-amber-800 text-[11px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. PRIMARY ACTION: FIND AN OBJECT & SECONDARY ACTIONS STRIP */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-md relative overflow-hidden">
        {/* Fine Architectural Grid Texture */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Primary Action Input Area */}
          <div className="flex-1 max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono font-bold uppercase tracking-wider">
                PRIMARY OPERATIONAL ACTION
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Optical CCTV Sweep
              </span>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="absolute left-3 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="command-center-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="FIND AN OBJECT (e.g. Bottle, Backpack, Laptop, Person)..."
                className="w-full pl-9 pr-32 py-2 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all font-sans"
              />
              <button
                type="submit"
                id="command-center-scan-btn"
                className="absolute right-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>SCAN FEEDS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </form>

            {/* Quick Target Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-mono text-slate-400">Quick Target:</span>
              {QUICK_TARGETS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleQuickTargetClick(item.label)}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/70 text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Operational Actions Strip */}
          <div className="flex md:flex-col gap-2 justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800/80 md:pl-4">
            <button
              type="button"
              id="action-live-cameras"
              onClick={handleLiveCameras}
              className="flex-1 md:flex-none px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 flex items-center justify-center md:justify-start gap-2 transition-colors cursor-pointer shadow-xs group"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-105 transition-transform" />
              <span>LIVE CAMERAS</span>
            </button>

            <button
              type="button"
              id="action-investigations"
              onClick={handleInvestigations}
              className="flex-1 md:flex-none px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 flex items-center justify-center md:justify-start gap-2 transition-colors cursor-pointer shadow-xs group"
            >
              <FolderSearch className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-105 transition-transform" />
              <span>INVESTIGATIONS</span>
            </button>

            <button
              type="button"
              id="action-detection-history"
              onClick={handleDetectionHistory}
              className="flex-1 md:flex-none px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 flex items-center justify-center md:justify-start gap-2 transition-colors cursor-pointer shadow-xs group"
            >
              <History className="w-3.5 h-3.5 text-blue-400 group-hover:scale-105 transition-transform" />
              <span>DETECTION HISTORY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auth Gate Notification for Unauthenticated Viewers */}
      {!isAuthenticated && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600 shrink-0" />
            <div>
              <span className="font-bold">Operator Authentication Recommended: </span>
              <span className="text-slate-600 text-[11px]">Sign in for continuous real-time PTZ control and evidence hashing.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold cursor-pointer shadow-2xs transition-colors shrink-0"
          >
            Sign In
          </button>
        </div>
      )}

      {/* 3. SYSTEM STATUS GRID (6 Key Operational Metrics) */}
      <div>
        <div className="flex items-center justify-between pb-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase font-sans">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>System Status & Diagnostic Telemetry</span>
          </div>
          <button
            type="button"
            onClick={() => setShowOracleModal(true)}
            className="text-[11px] font-mono text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium"
          >
            Oracle 21c Database Inspector →
          </button>
        </div>
        <SystemStatusGrid 
          status={data.systemStatus} 
          isLoading={isLoading}
          onCameraClick={handleLiveCameras}
          onStorageClick={() => setShowOracleModal(true)}
          onDetectionClick={handleDetectionHistory}
        />
      </div>

      {/* 4. OPERATIONAL TWO-COLUMN COMMAND PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
        {/* Left Column (5 cols on lg): Alerts & Active Investigations */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          {/* Section: Alerts */}
          <SecurityAlertsPanel 
            alerts={data.alerts} 
            isLoading={isLoading}
            onAlertAction={handleAlertAction}
            onDismissAlert={handleDismissAlert}
          />

          {/* Section: Active Investigations */}
          <ActiveInvestigations 
            investigations={data.investigations} 
            isLoading={isLoading}
            onSelectCase={handleSelectCase}
            onViewAllClick={handleInvestigations}
            onStartSearchClick={() => {
              const input = document.getElementById('command-center-search-input');
              if (input) input.focus();
            }}
          />
        </div>

        {/* Right Column (6 cols on lg): Recent Detections Feed */}
        <div className="lg:col-span-6 flex flex-col">
          <RecentDetectionsFeed 
            detections={data.recentDetections} 
            isLoading={isLoading}
            onDetectionClick={handleSelectDetection}
            onViewAllClick={handleDetectionHistory}
          />
        </div>
      </div>

    </div>
  );
};
