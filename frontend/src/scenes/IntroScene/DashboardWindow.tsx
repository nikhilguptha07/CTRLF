import React, { useRef, useState } from 'react';
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
  ChevronDown
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
  const [headerSearch, setHeaderSearch] = useState('');
  const [showChatAssistant, setShowChatAssistant] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  const isFormView = stage === 'OBJECT_INPUT' || stage === 'QUESTION' || activeFeedTab === 'search';

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

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (headerSearch.trim()) {
      startSearchFlow(headerSearch.trim());
    }
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
      className="w-full max-w-5xl h-[560px] sm:h-[570px] max-h-[calc(100vh-125px)] rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl flex flex-col overflow-hidden relative select-none font-sans"
      style={{
        boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
      }}
    >
      {/* 1. Top Enterprise Application Bar */}
      <header className="h-12 px-5 sm:px-6 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md relative z-10 text-xs">
        
        {/* Left: Brand Identity & Enterprise Badge */}
        <div 
          onClick={() => { setActiveFeedTab('home'); setStage('HOME'); }}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-6.5 h-6.5 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-sm tracking-tight uppercase font-sans">
              Control<span className="text-indigo-600">F</span>
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] font-mono font-medium text-slate-600">
              v2.4 Enterprise
            </span>
          </div>
        </div>

        {/* Center: Global Search Omnibar */}
        <form 
          onSubmit={handleHeaderSearchSubmit}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 border border-slate-200/80 text-slate-700 w-72 sm:w-84 shadow-2xs focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:bg-white focus-within:border-slate-300 transition-all"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Search targets, cameras, timestamps..."
            className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 font-medium"
          />
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-white border border-slate-200 rounded text-slate-400 shadow-2xs">
            /
          </kbd>
          {headerSearch && (
            <X 
              onClick={() => setHeaderSearch('')} 
              className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" 
            />
          )}
        </form>

        {/* Right: Clean Action Button & Role Switcher */}
        <div className="flex items-center gap-2">
          {/* Phase 6 RBAC: Role Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-[11px] font-mono font-bold text-slate-800 transition-colors cursor-pointer"
              title="Active Role: Click to switch between SUPER ADMIN, SECURITY MANAGER, and OPERATOR"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${
                currentUserRole === 'SUPER ADMIN' ? 'text-indigo-600' : currentUserRole === 'SECURITY MANAGER' ? 'text-emerald-600' : 'text-blue-600'
              }`} />
              <span className="hidden md:inline">{currentUserRole}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleSelector && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-fade-in font-sans">
                <div className="px-3 py-1 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
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
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      currentUserRole === role ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span className="font-mono text-[11px]">{role}</span>
                    {currentUserRole === role && <CheckCircle2 className="w-3 h-3 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeFeedTab !== 'home' && activeFeedTab !== 'overview' && (
            <button
              type="button"
              onClick={() => { setActiveFeedTab('home'); setStage('HOME'); }}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Overview
            </button>
          )}

          {/* Primary Action Button */}
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
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find Object</span>
          </button>
        </div>
      </header>

      {/* 2. Main Body with Enterprise Sidebar & Dynamic View */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Enterprise Navigation Sidebar */}
        <aside className="w-44 sm:w-48 border-r border-slate-200/80 p-3 flex flex-col justify-between shrink-0 bg-slate-50/50 backdrop-blur-sm text-xs select-none">
          <div className="space-y-4">
            
            {/* Group 1: SURVEILLANCE & SEARCH */}
            <div>
              <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 font-mono">
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
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Overview</span>
                  </div>
                </button>

                {/* 2. Live Cameras */}
                <button
                  type="button"
                  data-nav="cctv"
                  onClick={() => handleNavClick('cctv', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'cctv' && stage === 'HOME'
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Live Cameras</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    activeFeedTab === 'cctv' && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    4 Live
                  </span>
                </button>

                {/* 2b. Camera Network (Phase 6 Requirement #1) */}
                <button
                  type="button"
                  data-nav="cameras"
                  onClick={() => handleNavClick('cameras', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'cameras' && stage === 'HOME'
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Network className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                    <span className="truncate">Camera Network</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    activeFeedTab === 'cameras' && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                  }`}>
                    7 Nodes
                  </span>
                </button>

                {/* 2c. Alert Center (Phase 6 Requirement #2) */}
                <button
                  type="button"
                  data-nav="alerts"
                  onClick={() => handleNavClick('alerts', 'HOME')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeFeedTab === 'alerts' && stage === 'HOME'
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span className="truncate">Alert Center</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    activeFeedTab === 'alerts' && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
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
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Find Object</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    isFormView ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
                  }`}>
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
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderSearch className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                    <span className="truncate">Investigations</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    activeFeedTab === 'investigation' && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                  }`}>
                    Active
                  </span>
                </button>
              </nav>
            </div>

            {/* Group 2: DATA & INTELLIGENCE */}
            <div>
              <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 font-mono">
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
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Detection History</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    (activeFeedTab === 'history' || activeFeedTab === 'logs') && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
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
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Analytics</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    activeFeedTab === 'heatmaps' && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
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
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
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
              <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 font-mono">
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
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/90 font-medium'
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
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer bg-indigo-50/90 hover:bg-indigo-100/90 text-indigo-900 border border-indigo-200/80 shadow-2xs font-semibold mt-1"
                    title="Open Dedicated Admin Console"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                      <span className="truncate">Admin Console</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-indigo-400" />
                  </button>
                )}
              </nav>
            </div>
          </div>

          {/* Bottom Database Telemetry Tile */}
          <div 
            onClick={() => setShowOracleModal(true)}
            title="Oracle 21c Database Health & Schema Inspector"
            className="p-2.5 rounded-xl bg-white border border-slate-200/90 text-[10px] text-slate-700 flex flex-col gap-1.5 cursor-pointer hover:border-slate-300 transition-all shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Oracle 21c XE</span>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>STATE: CONNECTED</span>
              <span className="text-emerald-700 font-bold">12ms</span>
            </div>
          </div>
        </aside>

        {/* Center Dynamic Content Area */}
        <main className="flex-1 p-5 sm:p-6 overflow-y-auto flex flex-col justify-between bg-gradient-to-b from-white/30 via-white/50 to-slate-50/50 relative">
          {renderActiveView()}

          {/* Floating AI Assistant Trigger */}
          <div className="absolute right-5 bottom-5 z-20">
            <button
              type="button"
              title="Surveillance AI Assistant"
              onClick={() => setShowChatAssistant((prev) => !prev)}
              className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* AI Assistant Flyout */}
          {showChatAssistant && (
            <div className="absolute right-5 bottom-16 w-80 rounded-xl bg-white/98 backdrop-blur-xl border border-slate-200 shadow-xl p-4 z-30 space-y-3 animate-fade-in text-xs text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>ControlF Assistant</span>
                </div>
                <X 
                  onClick={() => setShowChatAssistant(false)} 
                  className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" 
                />
              </div>

              <p className="text-slate-500 text-[11px] leading-relaxed">
                Enter target descriptor to command optical CCTV sweep:
              </p>

              <form onSubmit={handleChatSubmit} className="space-y-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="e.g. Black backpack..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Oracle 21c Engine
                  </span>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
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
