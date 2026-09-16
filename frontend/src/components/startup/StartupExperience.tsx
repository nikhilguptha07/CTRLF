import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { CameraNetwork3D } from '../three/CameraNetwork3D';
import { soundService } from '../../services/soundService';

interface StartupExperienceProps {
  onComplete: () => void;
}

type IntroPhase = 
  | 'void'             // Scene 1: Absolute darkness with faint technical signal
  | 'telemetry'        // Scene 2: System Initialization telemetry
  | 'spatial_network'  // Scene 3: 3D Camera Network boots in space
  | 'search_pulse'     // Scene 4: Fast search signal activating CAM nodes
  | 'brand_reveal'     // Scene 5: # CONTROLF — FIND WHAT MATTERS.
  | 'zoom_transition'; // Scene 6: Seamless camera zoom into focal node -> Dashboard

interface BootTelemetryItem {
  module: string;
  status: string;
  active: boolean;
}

const BOOT_ITEMS: BootTelemetryItem[] = [
  { module: 'NETWORK', status: 'CONNECTING', active: false },
  { module: 'CAMERA FABRIC', status: 'ONLINE', active: false },
  { module: 'VISION ENGINE', status: 'INITIALIZING', active: false },
  { module: 'OBJECT INDEX', status: 'READY', active: false },
  { module: 'SECURITY CORE', status: 'ACTIVE', active: false },
];

const PULSE_NODES = [
  { id: 'CAM-01', location: 'North Main Lobby', status: 'ONLINE' },
  { id: 'CAM-07', location: 'Overhead Sector A', status: 'ONLINE' },
  { id: 'CAM-12', location: 'High Mast Junction', status: 'ONLINE' },
  { id: 'CAM-18', location: 'Transit Concourse', status: 'ONLINE' },
];

export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<IntroPhase>('void');
  const [activeTelemetryIndex, setActiveTelemetryIndex] = useState(0);
  const [pulseNodeIndex, setPulseNodeIndex] = useState(0);
  const completedRef = useRef(false);

  const finishSequence = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    try {
      sessionStorage.setItem('ctrlf_startup_seen', 'true');
    } catch {
      // Ignore if sessionStorage is unavailable
    }

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.04,
        duration: 0.6,
        ease: 'power3.inOut',
        onComplete: () => {
          onComplete();
        },
      });
    } else {
      onComplete();
    }
  }, [onComplete]);

  // Reduced motion check
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishSequence();
    }
  }, [finishSequence]);

  // Escape key skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        finishSequence();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finishSequence]);

  // Master Orchestrated Cinematic Timeline (~7.5s)
  useEffect(() => {
    if (completedRef.current) return;

    // Scene 1: Void (0.0s -> 1.0s)
    const tScene1 = setTimeout(() => {
      setPhase('telemetry');
      soundService.playScanPulse();
    }, 1000);

    // Scene 2: Boot telemetry sequence (1.0s -> 2.6s)
    const tTel1 = setTimeout(() => setActiveTelemetryIndex(1), 1300);
    const tTel2 = setTimeout(() => setActiveTelemetryIndex(2), 1600);
    const tTel3 = setTimeout(() => setActiveTelemetryIndex(3), 1900);
    const tTel4 = setTimeout(() => setActiveTelemetryIndex(4), 2200);

    // Scene 3: 3D Camera Network reveals in space (2.6s -> 4.4s)
    const tScene3 = setTimeout(() => {
      setPhase('spatial_network');
      soundService.playCameraPower();
    }, 2600);

    // Scene 4: Search Pulse sweeping through cameras (4.4s -> 5.8s)
    const tScene4 = setTimeout(() => {
      setPhase('search_pulse');
    }, 4400);
    const tPulse1 = setTimeout(() => setPulseNodeIndex(1), 4700);
    const tPulse2 = setTimeout(() => setPulseNodeIndex(2), 5050);
    const tPulse3 = setTimeout(() => setPulseNodeIndex(3), 5400);

    // Scene 5: ControlF Brand Reveal (5.8s -> 7.0s)
    const tScene5 = setTimeout(() => {
      setPhase('brand_reveal');
      soundService.playDetected();
      if (brandRef.current) {
        gsap.fromTo(
          brandRef.current,
          { opacity: 0, y: 16, letterSpacing: '0.15em' },
          { opacity: 1, y: 0, letterSpacing: '0.04em', duration: 0.8, ease: 'power3.out' }
        );
      }
    }, 5800);

    // Scene 6: Continuous camera dolly zoom -> enter app (7.0s -> 7.8s)
    const tScene6 = setTimeout(() => {
      setPhase('zoom_transition');
    }, 7000);

    const tEnd = setTimeout(() => {
      finishSequence();
    }, 7700);

    return () => {
      clearTimeout(tScene1);
      clearTimeout(tTel1);
      clearTimeout(tTel2);
      clearTimeout(tTel3);
      clearTimeout(tTel4);
      clearTimeout(tScene3);
      clearTimeout(tScene4);
      clearTimeout(tPulse1);
      clearTimeout(tPulse2);
      clearTimeout(tPulse3);
      clearTimeout(tScene5);
      clearTimeout(tScene6);
      clearTimeout(tEnd);
    };
  }, [finishSequence]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 w-screen h-screen bg-[#080b11] text-slate-100 flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Background Subtle Radar Vignette */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none z-10" />

      {/* Skip Button */}
      <button
        type="button"
        onClick={finishSequence}
        className="absolute top-6 right-8 z-30 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono font-semibold tracking-wider text-slate-400 hover:text-white uppercase transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <span>Skip Sequence</span>
        <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-slate-300">ESC</span>
      </button>

      {/* 3D Camera Fabric Viewport (Active in Scenes 3, 4, 5, 6) */}
      {(phase === 'spatial_network' || phase === 'search_pulse' || phase === 'brand_reveal' || phase === 'zoom_transition') && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-700 ${
          phase === 'zoom_transition' ? 'scale-125 opacity-40 transition-transform duration-700 ease-in' : 'opacity-100'
        }`}>
          <Canvas
            camera={{ position: [0, 4.2, 7.8], fov: 42 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[6, 12, 8]} intensity={0.9} />
            <CameraNetwork3D mode={phase === 'search_pulse' ? 'search' : 'intro'} />
          </Canvas>
        </div>
      )}

      {/* Scene 1 & 2: System Boot Telemetry */}
      {(phase === 'void' || phase === 'telemetry') && (
        <div className="relative z-20 max-w-md w-full px-6 flex flex-col items-start space-y-3 font-mono">
          <div className="flex items-center gap-2.5 text-xs font-bold tracking-widest text-[#00e5ff] uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-[#00e5ff] animate-ping" />
            <span>SYSTEM INITIALIZATION</span>
          </div>

          <div className="w-full space-y-1.5 pt-2 text-[12px] text-slate-400 border-l-2 border-[#00e5ff]/40 pl-3">
            {BOOT_ITEMS.map((item, idx) => {
              const isPassed = activeTelemetryIndex >= idx;
              return (
                <div
                  key={item.module}
                  className={`flex items-center justify-between transition-opacity duration-200 ${
                    isPassed ? 'opacity-100 text-slate-200' : 'opacity-25 text-slate-600'
                  }`}
                >
                  <span className="tracking-wider">{item.module}</span>
                  <span className="font-bold tracking-widest text-slate-500">
                    ................{' '}
                    <span className={isPassed ? 'text-[#00e5ff]' : 'text-slate-600'}>
                      {isPassed ? item.status : 'PENDING'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] tracking-wider text-slate-500 uppercase pt-2">
            PHYSICAL SURVEILLANCE MATRIX // SECURE OPERATIONAL CORE
          </div>
        </div>
      )}

      {/* Scene 4: Fast Search Pulse Nodes Overlay */}
      {phase === 'search_pulse' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-[#0d121d]/90 border border-[#00e5ff]/30 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
            <span className="text-slate-400 text-[11px] uppercase">SIGNAL TRANSIT:</span>
          </div>
          <div className="flex items-center gap-3">
            {PULSE_NODES.map((node, i) => {
              const isLit = pulseNodeIndex >= i;
              return (
                <div
                  key={node.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    isLit
                      ? 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/40'
                      : 'text-slate-600 bg-white/5'
                  }`}
                >
                  <span>{node.id}</span>
                  <span className="text-[9px] opacity-75">{node.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scene 5: ControlF Brand Reveal */}
      {(phase === 'brand_reveal' || phase === 'zoom_transition') && (
        <div
          ref={brandRef}
          className="relative z-20 flex flex-col items-center justify-center text-center space-y-3 px-6 select-none"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[10px] font-mono tracking-widest text-[#00e5ff] uppercase">
            <span>SOC STATION 01</span>
            <span>•</span>
            <span>AUTONOMOUS SURVEILLANCE INTELLIGENCE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-sans uppercase">
            CONTROL·F
          </h1>

          <p className="text-xs sm:text-sm font-mono tracking-widest text-slate-400 font-semibold uppercase">
            FIND WHAT MATTERS.
          </p>

          <div className="pt-4 flex items-center gap-1.5 text-[11px] font-mono text-[#00e5ff]/80">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />
            <span>CONNECTING TO MISSION COMMAND CENTER...</span>
          </div>
        </div>
      )}
    </div>
  );
};
