import React, { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';

interface StartupExperienceProps {
  onComplete: () => void;
}

interface CheckItem {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
}

const INITIAL_CHECKS: CheckItem[] = [
  { id: 'cam', label: 'Camera Network', status: 'pending' },
  { id: 'ai', label: 'AI Detection Engine', status: 'pending' },
  { id: 'idx', label: 'Object Index', status: 'pending' },
  { id: 'sec', label: 'Security System', status: 'pending' },
];

export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brandSectionRef = useRef<HTMLDivElement>(null);
  const sysInitSectionRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<'black' | 'init' | 'checks' | 'brand' | 'fading'>('black');
  const [checks, setChecks] = useState<CheckItem[]>(INITIAL_CHECKS);
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
        duration: 0.45,
        ease: 'power2.inOut',
        onComplete: () => {
          onComplete();
        },
      });
    } else {
      onComplete();
    }
  }, [onComplete]);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishSequence();
    }
  }, [finishSequence]);

  // Listen for Escape key to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishSequence();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finishSequence]);

  // Main automated sequence timeline
  useEffect(() => {
    if (completedRef.current) return;

    // Timeline step 1: Black screen to Init (350ms)
    const tInit = setTimeout(() => {
      setPhase('init');
    }, 350);

    // Timeline step 2: Checks begin (750ms)
    const tCheck0 = setTimeout(() => {
      setPhase('checks');
      setChecks((prev) =>
        prev.map((c, i) => (i === 0 ? { ...c, status: 'done' } : c))
      );
    }, 750);

    // Timeline step 3: Check 2 (1150ms)
    const tCheck1 = setTimeout(() => {
      setChecks((prev) =>
        prev.map((c, i) => (i === 1 ? { ...c, status: 'done' } : c))
      );
    }, 1150);

    // Timeline step 4: Check 3 (1550ms)
    const tCheck2 = setTimeout(() => {
      setChecks((prev) =>
        prev.map((c, i) => (i === 2 ? { ...c, status: 'done' } : c))
      );
    }, 1550);

    // Timeline step 5: Check 4 (1950ms)
    const tCheck3 = setTimeout(() => {
      setChecks((prev) =>
        prev.map((c, i) => (i === 3 ? { ...c, status: 'done' } : c))
      );
    }, 1950);

    // Timeline step 6: Brand reveal (2450ms)
    const tBrand = setTimeout(() => {
      setPhase('brand');
    }, 2450);

    // Timeline step 7: Complete and transition to dashboard (3250ms)
    const tFinish = setTimeout(() => {
      finishSequence();
    }, 3250);

    return () => {
      clearTimeout(tInit);
      clearTimeout(tCheck0);
      clearTimeout(tCheck1);
      clearTimeout(tCheck2);
      clearTimeout(tCheck3);
      clearTimeout(tBrand);
      clearTimeout(tFinish);
    };
  }, [finishSequence]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="System Startup Animation"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-[#02050e] text-slate-100 flex flex-col items-center justify-center font-mono select-none overflow-hidden"
    >
      {/* Subtle fine architectural scan lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '100% 3px',
        }}
      />

      {/* Top Bar: Telemetry Header & Skip Button */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-[10px] tracking-widest text-slate-500 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>CTRLF // CORE_SYS_v2.4</span>
        </div>

        <button
          type="button"
          onClick={finishSequence}
          className="px-3 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono transition-all cursor-pointer flex items-center gap-2 group shadow-sm"
          title="Skip intro animation (Esc)"
        >
          <span className="text-[10px] text-slate-500 group-hover:text-slate-400 border border-slate-700/80 px-1 py-0.2 rounded font-sans">
            ESC
          </span>
          <span>Skip</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-lg w-full px-6 flex flex-col items-center text-center">
        {/* Phase 1 & 2: System Initializing & Sequential Checks */}
        {(phase === 'init' || phase === 'checks') && (
          <div 
            ref={sysInitSectionRef}
            className="w-full space-y-6 animate-fade-in"
          >
            {/* Header */}
            <div className="space-y-1">
              <div className="text-xs sm:text-sm tracking-[0.2em] font-bold text-slate-300 uppercase">
                ControlF System Initializing
              </div>
              <div className="h-0.5 w-16 mx-auto bg-indigo-500/80 rounded-full" />
            </div>

            {/* Checklist */}
            <div className="w-full max-w-sm mx-auto space-y-2.5 text-left text-xs text-slate-400 font-mono py-2">
              {checks.map((item) => {
                const isDone = item.status === 'done';
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between border-b border-slate-800/60 pb-1.5 transition-opacity duration-200 ${
                      isDone ? 'opacity-100' : 'opacity-25'
                    }`}
                  >
                    <span className="tracking-wide text-slate-300">{item.label}</span>
                    <span className="text-slate-600 font-mono px-2 select-none">
                      ................
                    </span>
                    <span
                      className={`font-bold transition-all ${
                        isDone ? 'text-emerald-400 scale-110' : 'text-slate-600'
                      }`}
                    >
                      {isDone ? '✓' : '·'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase 3: Brand Reveal */}
        {phase === 'brand' && (
          <div
            ref={brandSectionRef}
            className="space-y-3 animate-fade-in text-center"
          >
            {/* Minimal Brand Title */}
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[0.22em] text-white uppercase font-sans">
              Control<span className="text-indigo-400">F</span>
            </h1>

            {/* Precision Subtitle */}
            <p className="text-[11px] sm:text-xs font-mono font-medium tracking-[0.2em] text-slate-400 uppercase">
              "Intelligent Physical-World Search"
            </p>

            <div className="pt-4 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-[10px] text-slate-500 font-mono">ESTABLISHING SECURE CONSOLE...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[10px] font-mono text-slate-600">
        <span>SECURITY LEVEL: RESTRICTED</span>
        <span>ORACLE 21c XE // BYTETRACK READY</span>
      </div>
    </div>
  );
};
