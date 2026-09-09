import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useExperienceStore } from '../store/useExperienceStore';
import { IntroScene } from '../scenes/IntroScene/IntroScene';
import { DetectionScene } from '../scenes/DetectionScene/DetectionScene';
import { playMasterCinematicTransition } from '../animation/transitionTimeline';
import { createMasterDemoTimeline } from '../animation/masterTimeline';
import { soundService } from '../services/soundService';
import { AuthModal } from '../components/auth/AuthModal';
import { 
  Play, 
  Pause, 
  Terminal,
  Volume2,
  VolumeX,
  Database,
  LogIn,
  LogOut,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  const { 
    stage, 
    setStage, 
    soundEnabled, 
    toggleSound,
    currentUser,
    isAuthenticated,
    showAuthModal,
    setShowAuthModal,
    setCurrentUser,
    logout,
    checkAuth
  } = useExperienceStore();
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Check auth session on startup
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  const dashboardContainerRef = useRef<HTMLDivElement>(null);
  const transitionOverlayRef = useRef<HTMLDivElement>(null);
  const demoTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // Initialize Web Audio on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      soundService.enableAudio();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Reset dashboard styles when returning to HOME or OBJECT_INPUT
  useEffect(() => {
    if (stage === 'HOME' || stage === 'OBJECT_INPUT' || stage === 'INTRO' || stage === 'QUESTION') {
      if (dashboardContainerRef.current) {
        gsap.killTweensOf(dashboardContainerRef.current);
        gsap.set(dashboardContainerRef.current, {
          clearProps: 'all',
          opacity: 1,
          scale: 1,
          filter: 'none',
        });
      }
      if (transitionOverlayRef.current) {
        gsap.killTweensOf(transitionOverlayRef.current);
        gsap.set(transitionOverlayRef.current, {
          clearProps: 'all',
          opacity: 0,
        });
      }
    }
  }, [stage]);

  // Keyboard shortcuts: M for sound toggle, Space for optional reference demo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayDemo();
          break;
        case 'm':
        case 'M':
          toggleSound();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSound]);

  // Handle Master Cinematic Transition from Scene 1 to Scene 2
  useEffect(() => {
    if (stage === 'PREPARING' || stage === 'TRANSITION') {
      const tl = playMasterCinematicTransition(
        dashboardContainerRef.current,
        transitionOverlayRef.current,
        null,
        {
          onDarknessReached: () => {
            setStage('SEARCHING');
          },
        }
      );

      return () => {
        // Guarantee overlay is never left stuck with dark opacity
        if (transitionOverlayRef.current) {
          gsap.to(transitionOverlayRef.current, {
            opacity: 0,
            duration: 0.2,
            ease: 'power2.out',
            overwrite: 'auto',
            onComplete: () => {
              if (transitionOverlayRef.current) {
                gsap.set(transitionOverlayRef.current, { clearProps: 'all', opacity: 0 });
              }
            },
          });
        }
        tl.kill();
      };
    }
  }, [stage, setStage]);

  // Auto Demo sequence player (plays 10.0s reference recreation)
  const handlePlayDemo = () => {
    if (isPlayingDemo) {
      demoTimelineRef.current?.kill();
      setIsPlayingDemo(false);
      return;
    }

    setIsPlayingDemo(true);
    demoTimelineRef.current = createMasterDemoTimeline({
      loop: true,
      onTimeUpdate: (t) => setCurrentTime(t),
      onStageChange: () => {},
    });

    demoTimelineRef.current.eventCallback('onComplete', () => {
      setIsPlayingDemo(false);
    });
  };

  const isLightScene =
    stage === 'HOME' ||
    stage === 'OBJECT_INPUT' ||
    stage === 'PREPARING' ||
    stage === 'INTRO' ||
    stage === 'QUESTION' ||
    stage === 'TRANSITION';

  const isDetectionView =
    stage === 'SEARCHING' ||
    stage === 'TARGET_ACQUIRED' ||
    stage === 'DETECTED' ||
    stage === 'NOT_DETECTED' ||
    stage === 'ERROR';

  // Ensure full-brightness CCTV canvas exposure in all detection stages
  useEffect(() => {
    if (isDetectionView && transitionOverlayRef.current) {
      gsap.to(transitionOverlayRef.current, {
        opacity: 0,
        duration: 0.22,
        ease: 'power2.out',
        overwrite: 'auto',
        onComplete: () => {
          if (transitionOverlayRef.current) {
            gsap.set(transitionOverlayRef.current, { clearProps: 'all', opacity: 0 });
          }
        },
      });
    }
  }, [isDetectionView]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      
      {/* Scene 1: Light Cinematic Environment & Floating Glass Dashboard */}
      {isLightScene && (
        <div
          ref={dashboardContainerRef}
          className="absolute inset-0 z-10 w-full h-full"
        >
          <IntroScene />
        </div>
      )}

      {/* Scene 2, 3, 4: Dark Studio CCTV Surveillance 3D Environment */}
      {isDetectionView && (
        <div className="absolute inset-0 z-20 w-full h-full">
          <DetectionScene timelineTime={isPlayingDemo ? currentTime : undefined} />
        </div>
      )}

      {/* Master Transition Darkness Overlay */}
      <div
        ref={transitionOverlayRef}
        className="absolute inset-0 z-30 pointer-events-none bg-black opacity-0"
      />

      {/* Sleek Operator Telemetry, Oracle 21c XE Indicator & Auth Bar */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-2 flex-wrap justify-end max-w-[calc(100vw-1.5rem)]">
        
        {/* Oracle 21c XE Operational Status Indicator */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-1.5 border border-[#E5E7EB] shadow-xs flex items-center gap-2 text-xs font-sans transition-all">
          <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-800 tracking-tight hidden md:inline">ORACLE 21c XE</span>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>

        {/* Operator Profile / Login Button */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-1.5 border border-[#E5E7EB] shadow-xs flex items-center gap-2 text-xs font-sans transition-all">
          {isAuthenticated && currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4361ee] shrink-0" />
                <span className="font-semibold text-[11px] text-slate-900">
                  {currentUser.username || currentUser.fullName || currentUser.email?.split('@')[0]}
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[10px] bg-[#4361ee] text-white font-bold tracking-wide">
                  {currentUser.role || 'ADMIN'}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Log out operator"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 text-[#4361ee] hover:text-[#364fc7] font-semibold text-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="text-[11px]">OPERATOR LOGIN</span>
            </button>
          )}
        </div>

        {/* System & Audio Controls */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-1.5 border border-[#E5E7EB] shadow-xs flex items-center gap-2.5 text-xs font-sans transition-all">
          <div className="flex items-center gap-1.5 font-sans">
            <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-800 font-bold text-[11px] hidden sm:inline">SYSTEM:</span>
            <span className={`font-bold uppercase tracking-wider text-[11px] ${
              stage === 'DETECTED' ? 'text-emerald-600' :
              stage === 'NOT_DETECTED' ? 'text-rose-600' :
              stage === 'SEARCHING' || stage === 'TARGET_ACQUIRED' ? 'text-[#4361ee] animate-pulse' :
              'text-[#4361ee]'
            }`}>
              {stage}
            </span>
            {isPlayingDemo && (
              <span className="text-indigo-600 font-mono text-[10px] ml-1 font-semibold">
                (DEMO {currentTime.toFixed(1)}s)
              </span>
            )}
          </div>

          <div className="h-4 w-[1px] bg-[#E5E7EB]"></div>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition-all ${
              soundEnabled
                ? 'bg-indigo-50 text-[#4361ee] border-indigo-200 hover:bg-indigo-100'
                : 'bg-white text-slate-700 border-[#E5E7EB] hover:bg-slate-50 hover:text-slate-900'
            }`}
            title={soundEnabled ? 'Audio Active (Press M to Mute)' : 'Audio Muted (Press M to Unmute)'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Optional Reference Demo Toggle */}
          <button
            type="button"
            onClick={handlePlayDemo}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              isPlayingDemo
                ? 'bg-indigo-50 text-[#4361ee] border-indigo-300 shadow-xs animate-pulse'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-[#E5E7EB] shadow-2xs'
            }`}
            title="Toggle 10-second reference sequence recreation"
          >
            {isPlayingDemo ? <Pause className="w-3 h-3 text-[#4361ee]" /> : <Play className="w-3 h-3 text-[#4361ee]" />}
            <span className="hidden sm:inline">{isPlayingDemo ? 'Stop Demo' : '10s Demo'}</span>
          </button>
        </div>
      </div>

      {/* Oracle 21c Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />

    </div>
  );
}

