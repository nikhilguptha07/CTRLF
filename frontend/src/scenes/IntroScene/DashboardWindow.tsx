import React, { useRef, useState } from 'react';
import { 
  Search, 
  X, 
  Home, 
  Layers, 
  MessageSquare, 
  Camera,
  UploadCloud,
  Sliders,
  Clock,
  Sparkles,
  CheckCircle2,
  Shield,
  Database,
  Radio,
  ChevronRight
} from 'lucide-react';
import { MainDashboard } from './MainDashboard';
import { LostObjectForm } from '../SearchScene/LostObjectForm';
import { CCTVGrid } from '../../components/dashboard/CCTVGrid';
import { DetectionLogs } from '../../components/dashboard/DetectionLogs';
import { SpatialHeatmap } from '../../components/dashboard/SpatialHeatmap';
import { VideoUploadView } from '../../components/dashboard/VideoUploadView';
import { SettingsView } from '../../components/dashboard/SettingsView';
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
    isAuthenticated,
    setShowAuthModal,
    openAuthModal,
    setShowOracleModal
  } = useExperienceStore();
  const { navigate } = useAdminRouter();
  const [headerSearch, setHeaderSearch] = useState('');
  const [showChatAssistant, setShowChatAssistant] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
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
      className="w-full max-w-5xl h-[610px] rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/95 shadow-2xl flex flex-col overflow-hidden relative select-none font-sans"
      style={{
        transformStyle: 'preserve-3d',
        boxShadow: '0 25px 65px -15px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
      }}
    >
      {/* 1. Top SaaS Application Bar with Glassmorphic Finish */}
      <header className="h-14 px-5 sm:px-6 border-b border-slate-200/70 flex items-center justify-between shrink-0 bg-white/60 backdrop-blur-md relative z-10 text-xs">
        
        {/* Left: Brand Identity & SaaS Tag */}
        <div 
          onClick={() => { setActiveFeedTab('home'); setStage('HOME'); }}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xs shadow-indigo-300">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 text-sm tracking-tight">control f</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] font-mono font-semibold text-slate-600">
              v2.4 Pro
            </span>
          </div>
        </div>

        {/* Center: SaaS Omnibar Search */}
        <form 
          onSubmit={handleHeaderSearchSubmit}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 w-64 sm:w-80 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white transition-all"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Search object, cameras, or logs..."
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

        {/* Right: Operational Status, Operator Pill, CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Oracle 21c Live Status Pill with Bubble Feature */}
          <button
            type="button"
            onClick={() => setShowOracleModal(true)}
            title="Oracle 21c Database Health & Hash Audit"
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs bubble-btn bubble-pill"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 bubble-beacon" />
            <span className="font-semibold">Oracle 21c</span>
          </button>

          {/* User Sign In / Profile with Bubble Feature */}
          {isAuthenticated && currentUser ? (
            <div 
              onClick={() => setActiveFeedTab('settings')}
              title="Operator Settings"
              className="bubble-btn bubble-pill flex items-center gap-2 px-3 py-1 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 cursor-pointer transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                {(currentUser.fullName || currentUser.username || 'O')[0].toUpperCase()}
              </div>
              <span className="font-semibold text-slate-800 text-xs hidden sm:inline">
                {currentUser.username}
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                {currentUser.role}
              </span>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={() => setShowAuthModal(true)}
              className="bubble-btn bubble-pill px-3.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* Primary CTA with Bubble Feature */}
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
            className="bubble-btn bubble-pill px-4 py-1.5 bg-[#4361ee] hover:bg-[#3854d9] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Search className="w-3 h-3" />
            <span>Find Item</span>
          </button>
        </div>
      </header>

      {/* 2. Main Body with Categorized SaaS Mini Sidebar & Dynamic View */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Categorized Mini Sidebar */}
        <aside className="w-40 sm:w-44 border-r border-slate-200/70 p-3 flex flex-col justify-between shrink-0 bg-white/40 backdrop-blur-sm text-xs select-none">
          <div className="space-y-3.5">
            {/* Group 1: SURVEILLANCE */}
            <div>
              <div className="px-2.5 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Surveillance
              </div>
              <nav className="space-y-0.5">
                {/* Overview */}
                <button
                  type="button"
                  onClick={() => handleNavClick('home', 'HOME')}
                  className={`bubble-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    (activeFeedTab === 'home' || activeFeedTab === 'overview') && stage === 'HOME'
                      ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-white/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Overview</span>
                  </div>
                </button>

                {/* CCTV Feeds */}
                <button
                  type="button"
                  onClick={() => handleNavClick('cctv', 'HOME')}
                  className={`bubble-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    activeFeedTab === 'cctv' && stage === 'HOME'
                      ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-white/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">CCTV Feeds</span>
                  </div>
                  <span className={`bubble-pill text-[9px] font-bold px-2 py-0.5 ${
                    activeFeedTab === 'cctv' && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    4 Live
                  </span>
                </button>

                {/* Spatial Map */}
                <button
                  type="button"
                  onClick={() => handleNavClick('heatmaps', 'HOME')}
                  className={`bubble-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    activeFeedTab === 'heatmaps' && stage === 'HOME'
                      ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-white/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Spatial Map</span>
                  </div>
                  <span className={`bubble-pill text-[9px] font-bold px-2 py-0.5 ${
                    activeFeedTab === 'heatmaps' && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    3D
                  </span>
                </button>
              </nav>
            </div>

            {/* Group 2: INTELLIGENCE */}
            <div>
              <div className="px-2.5 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Intelligence
              </div>
              <nav className="space-y-0.5">
                {/* Find Object */}
                <button
                  type="button"
                  onClick={() => handleNavClick('search', 'OBJECT_INPUT')}
                  className={`bubble-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    isFormView
                      ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-white/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Find Object</span>
                  </div>
                  <span className={`bubble-pill text-[9px] font-bold px-2 py-0.5 ${
                    isFormView ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    AI
                  </span>
                </button>

                {/* Upload Video */}
                <button
                  type="button"
                  onClick={() => handleNavClick('upload', 'HOME')}
                  className={`bubble-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    activeFeedTab === 'upload' && stage === 'HOME'
                      ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-white/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Upload Video</span>
                  </div>
                </button>

                {/* Audit Logs */}
                <button
                  type="button"
                  onClick={() => handleNavClick('logs', 'HOME')}
                  className={`bubble-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    (activeFeedTab === 'logs' || activeFeedTab === 'history') && stage === 'HOME'
                      ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-white/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Audit Logs</span>
                  </div>
                  <span className={`bubble-pill text-[9px] font-bold px-2 py-0.5 ${
                    (activeFeedTab === 'logs' || activeFeedTab === 'history') && stage === 'HOME'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    DB
                  </span>
                </button>
              </nav>
            </div>

            {/* Group 3: SYSTEM */}
            <div>
              <div className="px-2.5 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                System
              </div>
              <nav className="space-y-0.5">
                {/* Preferences */}
                <button
                  type="button"
                  onClick={() => handleNavClick('settings', 'HOME')}
                  className={`bubble-btn w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                    activeFeedTab === 'settings' && stage === 'HOME'
                      ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-white/80 font-medium'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Preferences</span>
                </button>

                {/* Admin Console */}
                {isAuthenticated && currentUser?.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin')}
                    className="bubble-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-2xs font-semibold mt-1"
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

          {/* Bottom Database Telemetry Badge with Bubble Feature */}
          <div 
            onClick={() => setShowOracleModal(true)}
            title="Oracle 21c Database Health & Schema Inspector"
            className="bubble-btn bubble-pill p-2.5 bg-slate-100/90 hover:bg-white border border-slate-200/80 text-[10px] text-slate-700 flex flex-col gap-1 cursor-pointer transition-all shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Oracle 21c XE</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 bubble-beacon" />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium">
              <span>Status: Active</span>
              <span className="font-mono text-emerald-600 font-bold">12ms</span>
            </div>
          </div>
        </aside>

        {/* Center Dynamic Content Area */}
        <main className="flex-1 p-5 sm:p-6 overflow-y-auto flex flex-col justify-between bg-gradient-to-b from-white/20 via-white/40 to-slate-50/40 relative">
          {renderActiveView()}

          {/* Floating Blue Chat Assistant Button */}
          <div className="absolute right-5 bottom-5 z-20">
            <button
              type="button"
              title="Surveillance AI Assistant"
              onClick={() => setShowChatAssistant((prev) => !prev)}
              className="w-11 h-11 rounded-2xl bg-[#4361ee] text-white flex items-center justify-center shadow-lg shadow-indigo-300/50 hover:bg-[#3854d9] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 fill-white/20" />
            </button>
          </div>

          {/* AI Assistant Flyout */}
          {showChatAssistant && (
            <div className="absolute right-5 bottom-18 w-80 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl p-4 z-30 space-y-3 animate-fade-in text-xs text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Control F Assistant</span>
                </div>
                <X 
                  onClick={() => setShowChatAssistant(false)} 
                  className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" 
                />
              </div>

              <p className="text-slate-500 text-[11px] leading-relaxed">
                Enter any item to instantly command the CCTV camera to begin spatial sweep:
              </p>

              <form onSubmit={handleChatSubmit} className="space-y-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="e.g. Find my keys..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Oracle 21c Engine
                  </span>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-xs cursor-pointer"
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

