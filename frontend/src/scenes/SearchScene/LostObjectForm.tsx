import React, { useEffect, useState } from 'react';
import { useExperienceStore } from '../../store/useExperienceStore';
import { ArrowRight, Search } from 'lucide-react';

interface LostObjectFormProps {
  onSearchSubmit?: (query: string, source: 'CAMERA' | 'VIDEO' | 'ORCHESTRATOR') => void;
  autoAnimate?: boolean;
}

export const LostObjectForm: React.FC<LostObjectFormProps> = ({
  onSearchSubmit,
  autoAnimate = false,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    startSearchFlow,
  } = useExperienceStore();

  const [typedText, setTypedText] = useState(searchQuery || 'Keyz');
  const [showCursor, setShowCursor] = useState(true);

  // Blinking text cursor
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  // Optional auto-typing animation for Keyz
  useEffect(() => {
    if (!autoAnimate) {
      if (searchQuery) setTypedText(searchQuery);
      return;
    }

    const fullWord = 'Keyz';
    let currentIndex = 0;
    setTypedText('');

    const startTimeout = setTimeout(() => {
      const typeInterval = setInterval(() => {
        currentIndex++;
        setTypedText(fullWord.slice(0, currentIndex));
        if (currentIndex >= fullWord.length) {
          clearInterval(typeInterval);
          setSearchQuery('Keyz');
        }
      }, 150);

      return () => clearInterval(typeInterval);
    }, 400);

    return () => clearTimeout(startTimeout);
  }, [autoAnimate, setSearchQuery, searchQuery]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = typedText.trim() || 'Keyz';
    setSearchQuery(query);

    if (onSearchSubmit) {
      onSearchSubmit(query, 'CAMERA');
    } else {
      startSearchFlow(query, 'CAMERA');
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setTypedText(tag);
    setSearchQuery(tag);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center my-auto py-8 text-center space-y-6 select-none animate-fade-in font-sans">
      
      {/* 1. Header & Subtitle (Exact copy from reference video Scene 1.5) */}
      <div className="space-y-2.5 max-w-lg">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          What type of object you lost?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          Enjow one of object you lost? your contact object, the tern to hand and ex chanert and object
        </p>
      </div>

      {/* 2. Main Search Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-5">
        
        {/* Search Input Box with Focus Glow */}
        <div className="relative flex items-center">
          <input
            id="lost-object-input"
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="Type object name (e.g. Keyz, Backpack, Bottle)..."
            autoFocus
            className="w-full px-6 py-4 rounded-2xl bg-white/95 border-2 border-indigo-200/80 hover:border-indigo-400 focus:border-indigo-600 shadow-lg shadow-indigo-100/40 text-base sm:text-lg font-medium text-slate-900 focus:outline-none transition-all pr-12"
          />
          {showCursor && (
            <span className="absolute right-12 w-0.5 h-6 bg-indigo-600 animate-pulse pointer-events-none" />
          )}
          <div className="absolute right-4 text-slate-400 pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
        </div>

        {/* Subtext: "Examples or examples" */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Examples or examples:</span>
          {['Keyz', 'Bottle', 'Backpack', 'Laptop'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleQuickTagClick(tag)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 3. Primary Button: "Get Its Show to Promtine" (Reference Video) */}
        <div className="pt-2 flex justify-center">
          <button
            id="start-forensic-scan-btn"
            type="submit"
            className="px-8 sm:px-10 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-600 text-white text-sm sm:text-base font-bold shadow-xl shadow-indigo-200/60 hover:shadow-indigo-300/80 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
          >
            <span>Get Its Show to Promtine</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
