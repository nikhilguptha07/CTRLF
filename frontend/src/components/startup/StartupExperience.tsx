import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { CameraNetwork3D } from '../three/CameraNetwork3D';
import { soundService } from '../../services/soundService';

interface StartupExperienceProps {
  onComplete: () => void;
}

type StartupPhase =
  | 'darkness'         // Scene 1: Subtle stillness in dark spatial environment
  | 'activating_nodes' // Scene 2: Camera nodes activate one by one, connections link
  | 'network_active'   // Scene 3: Scanning pulse travels through surveillance fabric
  | 'brand_reveal'     // Scene 4: CONTROLF — FIND WHAT MATTERS.
  | 'dolly_zoom';      // Scene 5: Seamless zoom into focal camera node -> Live Dashboard

export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<StartupPhase>('darkness');
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
  const [lastActivatedNode, setLastActivatedNode] = useState<string | null>(null);
  const completedRef = useRef(false);

  const finishSequence = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    try {
      sessionStorage.setItem('ctrlf_startup_seen', 'true');
    } catch {
      // Ignore if unavailable
    }

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.03,
        duration: 0.55,
        ease: 'power2.inOut',
        onComplete: () => {
          onComplete();
        },
      });
    } else {
      onComplete();
    }
  }, [onComplete]);

  // Reduced motion support
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishSequence();
    }
  }, [finishSequence]);

  // ESC or Space key skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        finishSequence();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finishSequence]);

  // Orchestrated Cinematic Timeline (~6.5s)
  useEffect(() => {
    if (completedRef.current) return;

    // 0.8s: First Camera Node Activates
    const tNode1 = setTimeout(() => {
      setPhase('activating_nodes');
      setActiveNodeIds(['CAM-01']);
      setLastActivatedNode('CAM-01 • North Lobby');
      soundService.playScanPulse();
    }, 800);

    // 1.5s: Second Camera Node Activates & Link Forms
    const tNode2 = setTimeout(() => {
      setActiveNodeIds(['CAM-01', 'CAM-02']);
      setLastActivatedNode('CAM-02 • Transit Axis');
      soundService.playScanPulse();
    }, 1500);

    // 2.2s: Third & Fourth Camera Nodes Activate
    const tNode3 = setTimeout(() => {
      setActiveNodeIds(['CAM-01', 'CAM-02', 'CAM-07', 'CAM-12']);
      setLastActivatedNode('CAM-12 • North Corridor');
      soundService.playCameraPower();
    }, 2200);

    // 3.0s: Entire Camera Fabric Active
    const tNode4 = setTimeout(() => {
      setActiveNodeIds(['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04', 'CAM-07', 'CAM-12', 'CAM-18', 'CAM-21']);
      setLastActivatedNode('All 8 Nodes Online');
    }, 3000);

    // 3.5s: Signal Scan Wave sweeps across fabric
    const tScan = setTimeout(() => {
      setPhase('network_active');
      soundService.playScanPulse();
    }, 3500);

    // 4.6s: Brand Reveal — CONTROLF // FIND WHAT MATTERS.
    const tBrand = setTimeout(() => {
      setPhase('brand_reveal');
      soundService.playDetected();
      if (brandRef.current) {
        gsap.fromTo(
          brandRef.current,
          { opacity: 0, y: 12, letterSpacing: '0.12em' },
          { opacity: 1, y: 0, letterSpacing: '0.04em', duration: 0.7, ease: 'power2.out' }
        );
      }
    }, 4600);

    // 5.9s: Seamless continuous zoom into active camera node (CAM-12)
    const tZoom = setTimeout(() => {
      setPhase('dolly_zoom');
    }, 5900);

    // 6.7s: Transition smoothly into Command Center
    const tEnd = setTimeout(() => {
      finishSequence();
    }, 6700);

    return () => {
      clearTimeout(tNode1);
      clearTimeout(tNode2);
      clearTimeout(tNode3);
      clearTimeout(tNode4);
      clearTimeout(tScan);
      clearTimeout(tBrand);
      clearTimeout(tZoom);
      clearTimeout(tEnd);
    };
  }, [finishSequence]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 w-screen h-screen bg-[#090d14] text-slate-100 flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Skip Button */}
      <button
        type="button"
        onClick={finishSequence}
        className="absolute top-6 right-8 z-30 px-3 py-1.5 rounded-lg bg-[#111722]/80 hover:bg-[#161e2e] border border-[#1f2b3e] text-[11px] font-mono font-medium tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <span>Skip</span>
        <span className="text-[9px] px-1 py-0.5 rounded bg-[#1f2b3e] text-slate-300">ESC</span>
      </button>

      {/* 3D Camera Network Viewport — Always active from stillness to activation */}
      <div className={`absolute inset-0 z-0 transition-all duration-700 ${
        phase === 'dolly_zoom' 
          ? 'scale-150 opacity-25 blur-xs transition-all duration-700 ease-in' 
          : phase === 'darkness' 
          ? 'opacity-40' 
          : 'opacity-100'
      }`}>
        <Canvas
          camera={{ 
            position: phase === 'dolly_zoom' ? [2.2, 0.9, 2.2] : [0, 4.4, 7.5], 
            fov: 40 
          }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={0.45} />
          <directionalLight position={[6, 12, 8]} intensity={0.75} />
          <CameraNetwork3D 
            mode={phase === 'network_active' ? 'search' : 'intro'} 
            activeNodeIds={activeNodeIds.length > 0 ? activeNodeIds : undefined}
          />
        </Canvas>
      </div>

      {/* Subtle telemetry pill when nodes activate */}
      {(phase === 'activating_nodes' || phase === 'network_active') && lastActivatedNode && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-[#0f1520]/90 border border-[#1a2536] text-[11px] font-mono text-slate-300 flex items-center gap-2 shadow-lg backdrop-blur-md animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00c4df] animate-pulse" />
          <span className="text-slate-400">CAMERA FABRIC:</span>
          <span className="text-white font-semibold">{lastActivatedNode}</span>
        </div>
      )}

      {/* Brand Reveal: CONTROLF — FIND WHAT MATTERS. */}
      {(phase === 'brand_reveal' || phase === 'dolly_zoom') && (
        <div
          ref={brandRef}
          className="relative z-20 flex flex-col items-center justify-center text-center space-y-2.5 px-6 select-none"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00c4df]/10 border border-[#00c4df]/25 text-[10px] font-mono tracking-widest text-[#00c4df] uppercase">
            <span>SURVEILLANCE INTELLIGENCE</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-sans">
            CONTROL<span className="text-[#00c4df]">F</span>
          </h1>

          <p className="text-xs sm:text-sm font-mono tracking-widest text-slate-400 font-semibold uppercase">
            FIND WHAT MATTERS.
          </p>
        </div>
      )}
    </div>
  );
};
