import React from 'react';
import { LostObjectForm } from './LostObjectForm';
import { ArrowLeft } from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';

export const SearchScene: React.FC = () => {
  const { setStage } = useExperienceStore();

  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-3xl">
        <div className="glass-panel-light p-10 shadow-2xl relative rounded-3xl border border-white/60">
          <button
            type="button"
            onClick={() => setStage('HOME')}
            className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="mt-4">
            <LostObjectForm />
          </div>
        </div>
      </div>
    </div>
  );
};
