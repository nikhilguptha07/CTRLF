import React, { useRef, useState } from 'react';
import { 
  Search, 
  X, 
  Home, 
  Layers, 
  MessageSquare, 
  User, 
  Camera,
  UploadCloud,
  Sliders,
  Clock,
  Sparkles,
  CheckCircle2,
  Shield
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
      className="w-full max-w-4xl h-[570px] rounded-3xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-2xl flex flex-col overflow-hidden relative select-none font-sans"
      style={{
        transformStyle: 'preserve-3d',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
      }}
    >
      {/* 1. Top Application Bar */}
      <header className="h-14 px-6 border-b border-slate-200/60 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md relative z-10 text-xs">
        
        {/* Left: 3-dot logo + "control f" */}
        <div 
          onClick={() => { setActiveFeedTab('home'); setStage('HOME'); }}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="w-5 h-5 flex flex-wrap gap-0.5 items-center justify-center p-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </div>
          <span className="font-extrabold text-slate-900 text-sm tracking-tight">control f</span>
        </div>

        {/* Center: Search pill bar */}
        <form 
          onSubmit={handleHeaderSearchSubmit}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 w-64 sm:w-72 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500/20"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Search object or tool..."
            className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 font-medium"
          />
          {headerSearch && (
            <X 
              onClick={() => setHeaderSearch('')} 
              className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" 
            />
          )}
        </form>

        {/* Right: Log in, Sign up button, Avatar */}
        <div className="flex items-center gap-3 sm:gap-4">
          {(activeFeedTab === 'home' || activeFeedTab === 'overview') && (
            <button 
              type="button" 
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                } else {
                  setActiveFeedTab('settings');
                }
              }}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {isAuthenticated && currentUser ? (currentUser.fullName || currentUser.username) : 'Sign In'}
            </button>
          )}
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
            className="px-4 py-1.5 rounded-xl bg-[#4361ee] hover:bg-[#3a56d4] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            Find Item
          </button>
          <div 
            onClick={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
              } else {
                setActiveFeedTab('settings');
              }
            }}
            title={isAuthenticated ? 'System Preferences' : 'Operator Login'}
            className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* 2. Main Body with Mini Sidebar & Dynamic View */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Mini Sidebar */}
        <aside className="w-36 sm:w-42 border-r border-slate-200/60 p-3 flex flex-col justify-between shrink-0 bg-white/30 backdrop-blur-sm text-xs select-none">
          <nav className="space-y-1">
            {/* Overview / Home */}
            <button
              type="button"
              onClick={() => handleNavClick('home', 'HOME')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                (activeFeedTab === 'home' || activeFeedTab === 'overview') && stage === 'HOME'
                  ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-white/80 font-medium'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="truncate">Overview</span>
            </button>

            {/* Find Object / Lost Object */}
            <button
              type="button"
              onClick={() => handleNavClick('search', 'OBJECT_INPUT')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                isFormView
                  ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-white/80 font-medium'
              }`}
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">Find Object</span>
            </button>

            {/* CCTV Feeds */}
            <button
              type="button"
              onClick={() => handleNavClick('cctv', 'HOME')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                activeFeedTab === 'cctv' && stage === 'HOME'
                  ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-white/80 font-medium'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span className="truncate">CCTV Feeds</span>
            </button>

            {/* Spatial Heatmap */}
            <button
              type="button"
              onClick={() => handleNavClick('heatmaps', 'HOME')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                activeFeedTab === 'heatmaps' && stage === 'HOME'
                  ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-white/80 font-medium'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className="truncate">Spatial Map</span>
            </button>

            {/* Audit Logs */}
            <button
              type="button"
              onClick={() => handleNavClick('logs', 'HOME')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                (activeFeedTab === 'logs' || activeFeedTab === 'history') && stage === 'HOME'
                  ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-white/80 font-medium'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">Audit Logs</span>
            </button>

            {/* Upload Footage */}
            <button
              type="button"
              onClick={() => handleNavClick('upload', 'HOME')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                activeFeedTab === 'upload' && stage === 'HOME'
                  ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-white/80 font-medium'
              }`}
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span className="truncate">Upload Video</span>
            </button>

            {/* Preferences */}
            <button
              type="button"
              onClick={() => handleNavClick('settings', 'HOME')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                activeFeedTab === 'settings' && stage === 'HOME'
                  ? 'bg-[#4361ee] text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-white/80 font-medium'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span className="truncate">Preferences</span>
            </button>

            {/* Admin Console - strictly for authenticated ADMIN users */}
            {isAuthenticated && currentUser?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-2xs font-semibold mt-2"
                title="Open Dedicated Admin Console"
              >
                <Shield className="w-4 h-4 shrink-0 text-indigo-600" />
                <span className="truncate">Admin Console</span>
              </button>
            )}
          </nav>

          {/* Bottom badge - Overview only */}
          {(activeFeedTab === 'home' || activeFeedTab === 'overview') && (
            <div 
              onClick={() => setShowOracleModal(true)}
              title="View Oracle 21c Database Health & Schema"
              className="p-2 rounded-xl bg-slate-100/80 hover:bg-white border border-slate-200/70 text-[10px] text-slate-700 flex items-center gap-2 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 group-hover:scale-125 transition-transform" />
              <span className="truncate font-semibold">Oracle 21c · Ready</span>
            </div>
          )}
        </aside>

        {/* Center Dynamic Content Area */}
        <main className="flex-1 p-5 sm:p-6 overflow-y-auto flex flex-col justify-between bg-gradient-to-b from-white/10 to-white/40 relative">
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
