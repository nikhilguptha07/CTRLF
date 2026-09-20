import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { Radio, Camera, Database, ArrowRight, SkipForward } from 'lucide-react';
import { soundService } from '../../services/soundService';

interface IntroExperienceProps {
  onComplete: () => void;
}

export const IntroExperience: React.FC<IntroExperienceProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brandGroupRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const telemetryRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const [, setStepIndex] = useState(0);
  const completedRef = useRef(false);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    try {
      sessionStorage.setItem('ctrlf_intro_seen', 'true');
    } catch {
      // Ignore if sessionStorage is not accessible
    }

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.05,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          onComplete();
        },
      });
    } else {
      onComplete();
    }
  }, [onComplete]);

  // Reduced motion preference check
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishIntro();
    }
  }, [finishIntro]);

  // Keyboard shortcut (ESC or Space to skip)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        finishIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finishIntro]);

  // Master GSAP Intro Timeline (Total duration: ~3.2 seconds)
  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        finishIntro();
      },
    });
    timelineRef.current = tl;

    // Optional audio cue
    try {
      soundService.playRadarPing();
    } catch {
      // Audio might be waiting for user gesture
    }

    // 0.0s: Inception - subtle aperture focus
    tl.set(containerRef.current, { opacity: 0 });
    tl.set(brandGroupRef.current, { opacity: 0, scale: 0.92, y: 15 });
    tl.set(reticleRef.current, { opacity: 0, scale: 0.8 });
    tl.set(telemetryRef.current, { opacity: 0, y: 10 });

    // Fade in container
    tl.to(containerRef.current, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
    });

    // Animate reticle aperture expansion
    tl.to(
      reticleRef.current,
      {
        opacity: 1,
        scale: 1.0,
        duration: 0.8,
        ease: 'power3.out',
      },
      0.1
    );

    // Reveal brand mark & title
    tl.to(
      brandGroupRef.current,
      {
        opacity: 1,
        scale: 1.0,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        onStart: () => setStepIndex(1),
      },
      0.3
    );

    // Reveal system telemetry indicators
    tl.to(
      telemetryRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        onStart: () => setStepIndex(2),
      },
      1.1
    );

    // Hold briefly to admire (1.8s - 2.8s)
    tl.to({}, { duration: 1.3 });

    return () => {
      tl.kill();
    };
  }, [finishIntro]);

  return (
    <div
      ref={containerRef}
      onClick={finishIntro}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center cursor-pointer select-none font-sans"
    >
      {/* Frosted Glass Vignette & Ambient Radial Glow */}
      <div className="absolute inset-0 bg-radial from-transparent via-white/30 to-slate-200/50 pointer-events-none" />

      {/* Optical Alignment Reticle (Signature ControlF Glass Rings) */}
      <div
        ref={reticleRef}
        className="absolute w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] rounded-full border border-indigo-200/60 pointer-events-none flex items-center justify-center"
      >
        <div className="w-[85%] h-[85%] rounded-full border border-dashed border-blue-300/40 animate-[spin_40s_linear_infinite]" />
        <div className="w-[60%] h-[60%] rounded-full border border-indigo-100/80" />
        {/* Subtle crosshairs */}
        <div className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-indigo-300/30 to-transparent" />
        <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
      </div>

      {/* Central Glass Inception Card */}
      <div
        ref={brandGroupRef}
        className="relative z-10 px-8 py-7 sm:px-12 sm:py-9 rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl flex flex-col items-center text-center space-y-4 max-w-md mx-4"
        style={{
          boxShadow: '0 25px 65px -15px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
        }}
      >
        {/* Glowing Brand Triad Beacon */}
        <div className="flex items-center gap-1.5 p-2 rounded-2xl bg-indigo-50 border border-indigo-100/80 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
        </div>

        {/* Primary Typography */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">control</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#4361ee]">f</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-md bg-indigo-100/70 border border-indigo-200 text-[10px] font-mono font-bold text-indigo-700">
              v2.4 Pro
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
            Autonomous Spatial Surveillance & Object Recovery
          </p>
        </div>

        {/* Dynamic Telemetry Status Chips */}
        <div
          ref={telemetryRef}
          className="w-full pt-3 border-t border-slate-200/70 grid grid-cols-3 gap-2 text-[10px] font-mono font-semibold text-slate-600"
        >
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
            <Camera className="w-3.5 h-3.5 text-indigo-600 mb-1" />
            <span className="text-[9px] text-slate-400">FEEDS</span>
            <span className="text-slate-800 font-bold">4 CCTV</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
            <Radio className="w-3.5 h-3.5 text-blue-600 mb-1 animate-pulse" />
            <span className="text-[9px] text-slate-400">VISION</span>
            <span className="text-slate-800 font-bold">YOLOv8</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
            <Database className="w-3.5 h-3.5 text-emerald-600 mb-1" />
            <span className="text-[9px] text-slate-400">DATABASE</span>
            <span className="text-emerald-700 font-bold">21c XE</span>
          </div>
        </div>

        {/* Interaction Prompt */}
        <div className="pt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-indigo-600 transition-colors">
          <span>Entering surveillance station</span>
          <ArrowRight className="w-3 h-3 animate-pulse" />
        </div>
      </div>

      {/* Floating Skip Intro Pill */}
      <div className="absolute bottom-8 right-8 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finishIntro();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 shadow-md text-slate-600 hover:text-slate-900 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer active:scale-95"
          title="Press ESC or Space to skip intro"
        >
          <SkipForward className="w-3 h-3 text-indigo-600" />
          <span>Skip Intro</span>
          <kbd className="text-[9px] font-mono px-1 py-0.2 bg-slate-100 rounded border border-slate-200 text-slate-400 ml-1">
            ESC
          </kbd>
        </button>
      </div>
    </div>
  );
};
