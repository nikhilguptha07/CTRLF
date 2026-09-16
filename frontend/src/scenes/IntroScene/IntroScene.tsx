import React from 'react';
import { DashboardWindow } from './DashboardWindow';

export const IntroScene: React.FC = () => {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080b11] text-slate-100 flex flex-col items-center justify-center select-none font-sans">
      {/* Subtle Technical Grid Floor and Vignette */}
      <div className="absolute inset-0 bg-grid-technical pointer-events-none z-0 opacity-40" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none z-0" />

      {/* Main Security Operations Command Center Shell */}
      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
        <DashboardWindow />
      </div>
    </div>
  );
};
