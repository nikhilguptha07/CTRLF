import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useExperienceStore } from '../store/useExperienceStore';
import { IntroScene } from '../scenes/IntroScene/IntroScene';
import { DetectionScene } from '../scenes/DetectionScene/DetectionScene';
import { playMasterCinematicTransition } from '../animation/transitionTimeline';
import { createMasterDemoTimeline } from '../animation/masterTimeline';
import { soundService } from '../services/soundService';
import { AuthModal } from '../components/auth/AuthModal';
import { DashboardTopControls } from '../components/dashboard/DashboardTopControls';
import { OracleStatusModal } from '../components/database/OracleStatusModal';
import { DemoPlayerHUD } from '../components/dashboard/DemoPlayerHUD';

export default function App() {
  const { 
    stage, 
    setStage, 
    toggleSound,
    showAuthModal,
    setShowAuthModal,
    showOracleModal,
    setShowOracleModal,
    setActiveFeedTab,
    setCurrentUser,
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

      {/* Dashboard-Only Top-Right Status & Controls Bar (Oracle 21c, Operator, System, Sound, Demo) */}
      <DashboardTopControls
        isPlayingDemo={isPlayingDemo}
        currentTime={currentTime}
        onPlayDemo={handlePlayDemo}
        onOpenOracleStatus={() => setShowOracleModal(true)}
      />

      {/* Floating Demo Player HUD during sequence playback */}
      <DemoPlayerHUD
        isPlaying={isPlayingDemo}
        currentTime={currentTime}
        onStop={handlePlayDemo}
      />

      {/* Oracle 21c Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />

      {/* Oracle 21c Database Health & Schema Modal */}
      <OracleStatusModal
        isOpen={showOracleModal}
        onClose={() => setShowOracleModal(false)}
        onOpenAuditLogs={() => {
          setShowOracleModal(false);
          setActiveFeedTab('logs');
          setStage('HOME');
        }}
      />

    </div>
  );
}

