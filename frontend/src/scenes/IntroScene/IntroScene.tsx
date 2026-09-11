import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CloudEnvironment } from './CloudEnvironment';
import { DashboardWindow } from './DashboardWindow';

export const IntroScene: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = ((clientX - left) / width - 0.5) * 2;
    const y = ((clientY - top) / height - 0.5) * 2;
    setMousePos({ x, y });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#eef2f6] via-[#f8fafc] to-[#e2e8f0] flex flex-col items-center justify-center pt-12 sm:pt-14 pb-4"
      style={{
        perspective: '1200px',
      }}
    >
      {/* 3D Background Cloud Environment */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 45 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <CloudEnvironment />
        </Canvas>
      </div>

      {/* Atmospheric Soft Vignette and Tint */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-radial from-transparent via-white/20 to-slate-200/40" />

      {/* Centered Floating Dashboard with Micro-Tilt Parallax and Generous Top Clearance */}
      <div
        className="relative z-20 w-full max-w-5xl px-4 flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${-mousePos.y * 2.2}deg) rotateY(${mousePos.x * 2.8}deg) translateZ(10px)`,
        }}
      >
        <DashboardWindow />
      </div>
    </div>
  );
};
