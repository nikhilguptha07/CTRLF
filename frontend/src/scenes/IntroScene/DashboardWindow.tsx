import React, { useRef, useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  LayoutDashboard, 
  Layers, 
  MessageSquare, 
  Video,
  UploadCloud,
  Settings,
  Clock,
  Sparkles,
  CheckCircle2,
  Shield,
  Database,
  Radio,
  ChevronRight,
  FolderSearch,
  Bell,
  Network,
  ShieldCheck,
  ChevronDown,
  Command
} from 'lucide-react';
import { MainDashboard } from './MainDashboard';
import { LostObjectForm } from '../SearchScene/LostObjectForm';
import { CCTVGrid } from '../../components/dashboard/CCTVGrid';
import { DetectionLogs } from '../../components/dashboard/DetectionLogs';
import { SpatialHeatmap } from '../../components/dashboard/SpatialHeatmap';
import { VideoUploadView } from '../../components/dashboard/VideoUploadView';
import { SettingsView } from '../../components/dashboard/SettingsView';
import { InvestigationView } from '../../components/investigation/InvestigationView';
import { CameraNetworkView } from '../../components/camera/CameraNetworkView';
import { AlertCenterView } from '../../components/alerts/AlertCenterView';
import { CommandPalette } from '../../components/common/CommandPalette';
import { useExperienceStore } from '../../store/useExperienceStore';
import { useAdminRouter } from '../../hooks/useAdminRouter';

export const DashboardWindow: React.FC = () => {
  const { 
    stage, 
    setStage, 
    activeFeedTab, 
    setActiveFeedTab, 
    startSearchFlow, 
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    isAuthenticated,
    setShowAuthModal,
    openAuthModal,
    setShowOracleModal
  } = useExperienceStore();
  const { navigate } = useAdminRouter();

  const [showChatAssistant, setShowChatAssistant] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  const isFormView = stage === 'OBJECT_INPUT' || stage === 'QUESTION' || activeFeedTab === 'search';

  // Global keyboard shortcut: Ctrl+K / Cmd+K to open Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (tab: any, targetStage: any = 'HOME') => {
    if (!isAuthenticated && tab !== 'home' && tab !== 'overview') {
      if (tab === 'upload') {
        openAuthModal('register');
      } else {
        openAuthModal('login');
      }
      return;
    }
    setActiveFeedTab(tab);
    setStage(targetStage);
  };

  const handleConnectLive = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActiveFeedTab('search');
    setStage('OBJECT_INPUT');
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (chatMessage.trim()) {
      const q = chatMessage.trim();
      setChatMessage('');
      setShowChatAssistant(false);
      startSearchFlow(q);
    }
  };

  const renderActiveView = () => {
    if (isFormView) {
      return <LostObjectForm autoAnimate={false} />;
    }
    switch (activeFeedTab) {
      case 'cctv':
        return <CCTVGrid />;
      case 'upload':
        return <VideoUploadView />;
      case 'heatmaps':
        return <SpatialHeatmap />;
      case 'logs':
      case 'history':
        return <DetectionLogs />;
      case 'settings':
        return <SettingsView />;
      case 'investigation':
        return <InvestigationView />;
      case 'cameras':
        return <CameraNetworkView />;
      case 'alerts':
        return <AlertCenterView />;
      case 'home':
      case 'overview':
      default:
        return <MainDashboard onConnectLiveClick={handleConnectLive} />;
    }
  };

  return (
    <div
      id="dashboard-window"
      ref={windowRef}
      className="w-full h-full flex flex-col bg-[#080b11] text-slate-100 select-none overflow-hidden font-sans relative"
    >
      {/* Global Command Palette */}
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
      />

      {/* 1. Top Enterprise Application Bar (Dark SOC Graphite Aesthetic) */}
      <header className="h-13 px-4 sm:px-6 border-b border-[#162032] flex items-center justify-between shrink-0 bg-[#0c111a]/95 backdrop-blur-md relative z-20 text-xs">
        
        {/* Left: Brand Identity & Enterprise Telemetry */}
        <div 
          onClick={() => { setActiveFeedTab('home'); setStage('HOME'); }}
          className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)]">
            <Radio className="w-4 h-4 text-[#00e5ff] animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm tracking-wider uppercase font-sans">
              CONTROL<span className="text-[#00e5ff]">F</span>
            </span>
            <span className="text-slate-500 font-mono text-[11px] hidden md:inline">//</span>
            <span className="text-slate-300 font-mono text-[11px] font-semibold hidden md:inline">
              Command Center
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#131b29] border border-[#1e2a40] text-[9px] font-mono font-medium text-cyan-400">
              SOC STATION 01
            </span>
          </div>
        </div>

        {/* Center: System Status & Global Command Palette Trigger */}
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d1624] border border-[#1b2c45] text-[10px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-300 font-semibold">SYSTEM STATUS</span>
            <span className="text-emerald-400 font-bold">OPERATIONAL</span>
          </div>

          {/* Command Search Omnibar / Palette Trigger */}
          <div 
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1420] hover:bg-[#121c2c] border border-[#1a2638] text-slate-400 w-56 sm:w-72 shadow-inner cursor-pointer transition-all group"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400/80 group-hover:text-cyan-400 shrink-0" />
            <span className="text-xs text-slate-400 group-hover:text-slate-300 font-medium truncate">
              Search cameras, cases, targets...
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-[#162234] border border-[#24344e] rounded text-slate-300 shadow-2xs ml-auto">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </div>
        </div>

        {/* Right: Role Switcher & Primary Action */}
        <div className="flex items-center gap-2.5">
          {/* RBAC Role Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1624] hover:bg-[#142033] border border-[#1c2d47] text-[11px] font-mono font-bold text-slate-200 transition-colors cursor-pointer"
              title="Active Role: Click to switch between SUPER ADMIN, SECURITY MANAGER, and OPERATOR"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${
                currentUserRole === 'SUPER ADMIN' ? 'text-[#00e5ff]' : currentUserRole === 'SECURITY MANAGER' ? 'text-emerald-400' : 'text-blue-400'
              }`} />
              <span className="hidden md:inline">{currentUserRole}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleSelector && (
              <div className="absolute right-0 mt-1.5 w-52 bg-[#0c121d] rounded-xl shadow-2xl border border-[#1d2b42] py-1.5 z-50 text-xs animate-fade-in font-sans">
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-[#162032]">
                  Select Security Role
                </div>
                {(['SUPER ADMIN', 'SECURITY MANAGER', 'OPERATOR'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setCurrentUserRole(role);
                      setShowRoleSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#142033] transition-colors cursor-pointer ${
                      currentUserRole === role ? 'font-bold text-[#00e5ff] bg-[#00e5ff]/5' : 'text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-[11px]">{role}</span>
                    {currentUserRole === role && <CheckCircle2 className="w-3 h-3 text-[#00e5ff]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Overview button when inside other views */}
          {activeFeedTab !== 'home' && activeFeedTab !== 'overview' && (
            <button
              type="button"
              onClick={() => { setActiveFeedTab('home'); setStage('HOME'); }}
              className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-[#142033] rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Overview
            </button>
          )}

          {/* Primary Action Button: Find Object */}
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              setActiveFeedTab('search');
              setStage('OBJECT_INPUT');
            }}
            className="px-3.5 py-1.5 bg-[#00e5ff] hover:bg-[#00cce6] text-[#080b11] text-xs font-extrabold rounded-lg shadow-[0_0_16px_rgba(0,229,255,0.3)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span>FIND AN OBJECT</span>
          </button>
        </div>
      </header>

      {/* 2. Main Body with Enterprise SOC Sidebar & Dynamic View */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Enterprise Navigation Sidebar */}
        <aside className="w-48 sm:w-52 border-r border-[#151f2e] p-3 flex flex-col justify-between shrink-0 bg-[#0a0f18] text-xs select-none">
          <div className="space-y-4">
            
            {/* Group 1: SURVEILLANCE & SEARCH */}
            <div>
              <div className="px-2.5 pb-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-500 font-mono">
                Surveillance
              </div>
              <nav className="space-y-0.5">
                {/* 1. Overview */}
                <button
                  type="button"
                  data-nav="overview"
                  onClick={() => handleNavClick('home', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    (activeFeedTab === 'home' || activeFeedTab === 'overview') && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Command Center</span>
                  </div>
                </button>

                {/* 2. Live Cameras */}
                <button
                  type="button"
                  data-nav="cctv"
                  onClick={() => handleNavClick('cctv', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'cctv' && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Live CCTV</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    4 Live
                  </span>
                </button>

                {/* 2b. Camera Network */}
                <button
                  type="button"
                  data-nav="cameras"
                  onClick={() => handleNavClick('cameras', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'cameras' && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Network className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span className="truncate">Camera Network</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    8 Nodes
                  </span>
                </button>

                {/* 2c. Alert Center */}
                <button
                  type="button"
                  data-nav="alerts"
                  onClick={() => handleNavClick('alerts', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'alerts' && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span className="truncate">Alert Center</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    5 Active
                  </span>
                </button>

                {/* 3. Find Object */}
                <button
                  type="button"
                  data-nav="search"
                  onClick={() => handleNavClick('search', 'OBJECT_INPUT')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    isFormView
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Find Object</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30">
                    AI
                  </span>
                </button>

                {/* 4. Investigations */}
                <button
                  type="button"
                  data-nav="investigation"
                  onClick={() => handleNavClick('investigation', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'investigation' && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderSearch className="w-3.5 h-3.5 shrink-0 text-[#00e5ff]" />
                    <span className="truncate">Investigations</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Active
                  </span>
                </button>
              </nav>
            </div>

            {/* Group 2: DATA & INTELLIGENCE */}
            <div>
              <div className="px-2.5 pb-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-500 font-mono">
                Data & Activity
              </div>
              <nav className="space-y-0.5">
                {/* 4. Detection History */}
                <button
                  type="button"
                  data-nav="history"
                  onClick={() => handleNavClick('history', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    (activeFeedTab === 'history' || activeFeedTab === 'logs') && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Detection History</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono bg-[#142033] text-slate-400">
                    DB
                  </span>
                </button>

                {/* 5. Analytics */}
                <button
                  type="button"
                  data-nav="analytics"
                  onClick={() => handleNavClick('heatmaps', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'heatmaps' && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Spatial Heatmap</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono bg-[#142033] text-slate-400">
                    3D
                  </span>
                </button>

                {/* 6. Footage Upload */}
                <button
                  type="button"
                  data-nav="upload"
                  onClick={() => handleNavClick('upload', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'upload' && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Footage Upload</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Group 3: CONFIGURATION */}
            <div>
              <div className="px-2.5 pb-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-500 font-mono">
                System
              </div>
              <nav className="space-y-0.5">
                {/* 7. Settings */}
                <button
                  type="button"
                  data-nav="settings"
                  onClick={() => handleNavClick('settings', 'HOME')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'settings' && stage === 'HOME'
                      ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Settings</span>
                </button>

                {/* 8. Admin Console (Admin Only) */}
                {isAuthenticated && currentUser?.role === 'ADMIN' && (
                  <button
                    type="button"
                    data-nav="admin"
                    onClick={() => navigate('/admin')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 shadow-xs font-semibold mt-1"
                    title="Open Dedicated Admin Console"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 shrink-0 text-[#00e5ff]" />
                      <span className="truncate">Admin Console</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-[#00e5ff]/80" />
                  </button>
                )}
              </nav>
            </div>
          </div>

          {/* Bottom Database Telemetry Tile */}
          <div 
            onClick={() => setShowOracleModal(true)}
            title="Oracle 21c Database Health & Schema Inspector"
            className="p-2.5 rounded-xl bg-[#0d1420] border border-[#1a283e] text-[10px] text-slate-300 flex flex-col gap-1.5 cursor-pointer hover:border-cyan-500/50 transition-all shadow-inner group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Oracle 21c XE</span>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>STATE: CONNECTED</span>
              <span className="text-emerald-400 font-bold">12ms</span>
            </div>
          </div>
        </aside>

        {/* Center Dynamic Content Area */}
        <main className="flex-1 p-4 sm:p-5 overflow-y-auto flex flex-col justify-between bg-[#080b11] relative">
          {renderActiveView()}

          {/* Floating AI Assistant Trigger */}
          <div className="absolute right-5 bottom-5 z-20">
            <button
              type="button"
              title="Surveillance AI Assistant"
              onClick={() => setShowChatAssistant((prev) => !prev)}
              className="w-10 h-10 rounded-xl bg-[#00e5ff] text-[#080b11] flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)] hover:bg-[#00cce6] transition-all hover:scale-105 active:scale-95 cursor-pointer font-bold"
            >
              <MessageSquare className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* AI Assistant Flyout */}
          {showChatAssistant && (
            <div className="absolute right-5 bottom-16 w-84 rounded-xl bg-[#0c121d] border border-[#1f2d44] shadow-2xl p-4 z-30 space-y-3 animate-fade-in text-xs text-slate-200">
              <div className="flex items-center justify-between border-b border-[#182335] pb-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Sparkles className="w-4 h-4 text-[#00e5ff]" />
                  <span>ControlF Optical Assistant</span>
                </div>
                <X 
                  onClick={() => setShowChatAssistant(false)} 
                  className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" 
                />
              </div>

              <p className="text-slate-400 text-[11px] leading-relaxed">
                Enter target descriptor to command optical CCTV sweep:
              </p>

              <form onSubmit={handleChatSubmit} className="space-y-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="e.g. Black backpack..."
                  className="w-full px-3 py-2 rounded-lg bg-[#080b11] border border-[#1e2c42] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00e5ff] focus:border-[#00e5ff]"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    Oracle 21c Engine
                  </span>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#00e5ff] hover:bg-[#00cce6] text-[#080b11] font-bold text-[11px] shadow-xs cursor-pointer transition-colors"
                  >
                    Locate
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

