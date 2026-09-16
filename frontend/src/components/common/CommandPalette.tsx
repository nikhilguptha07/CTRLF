import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Camera, 
  FileText, 
  Shield, 
  LayoutDashboard, 
  Video, 
  Network, 
  Bell, 
  Sparkles, 
  ArrowRight, 
  X,
  Sliders
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';
import { useAdminRouter } from '../../hooks/useAdminRouter';

interface CommandItem {
  id: string;
  category: 'CAMERAS' | 'INVESTIGATIONS' | 'SEARCH' | 'NAVIGATION' | 'ACTIONS';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    setActiveFeedTab, 
    setStage, 
    startSearchFlow, 
    openInvestigation, 
    setCurrentUserRole 
  } = useExperienceStore();
  const { navigate } = useAdminRouter();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    // Navigation
    {
      id: 'nav-home',
      category: 'NAVIGATION',
      title: 'Command Center Overview',
      subtitle: 'Return to Security Operations Center home display',
      icon: <LayoutDashboard className="w-4 h-4 text-[#00e5ff]" />,
      action: () => { setActiveFeedTab('home'); setStage('HOME'); onClose(); },
    },
    {
      id: 'nav-cctv',
      category: 'NAVIGATION',
      title: 'Live Camera Fleet Grid',
      subtitle: 'View synchronized RTSP camera wall feeds',
      badge: '4 LIVE',
      icon: <Video className="w-4 h-4 text-[#00e5ff]" />,
      action: () => { setActiveFeedTab('cctv'); setStage('HOME'); onClose(); },
    },
    {
      id: 'nav-network',
      category: 'NAVIGATION',
      title: 'Camera Network Topology',
      subtitle: 'Inspect physical camera nodes, latency, and status',
      badge: '7 NODES',
      icon: <Network className="w-4 h-4 text-indigo-400" />,
      action: () => { setActiveFeedTab('cameras'); setStage('HOME'); onClose(); },
    },
    {
      id: 'nav-alerts',
      category: 'NAVIGATION',
      title: 'Alert Center & Security Warnings',
      subtitle: 'Review critical security incidents and sensor alerts',
      badge: '2 NEW',
      icon: <Bell className="w-4 h-4 text-amber-400" />,
      action: () => { setActiveFeedTab('alerts'); setStage('HOME'); onClose(); },
    },
    {
      id: 'nav-admin',
      category: 'NAVIGATION',
      title: 'Security Admin Console',
      subtitle: 'System health, users, RBAC permissions, and audit chain',
      badge: 'ADMIN',
      icon: <Shield className="w-4 h-4 text-purple-400" />,
      action: () => { navigate('/admin'); onClose(); },
    },

    // Investigations
    {
      id: 'inv-421',
      category: 'INVESTIGATIONS',
      title: 'Open INV-2026-00421',
      subtitle: 'Missing Laptop • North Corridor • Lead: Operator Chen',
      badge: 'ACTIVE',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      action: () => { openInvestigation('INV-2026-00421'); onClose(); },
    },
    {
      id: 'inv-2048',
      category: 'INVESTIGATIONS',
      title: 'Open INV-2048',
      subtitle: 'Black Backpack • CAM-12 Axis • Status: SEARCHING',
      badge: 'SEARCHING',
      icon: <FileText className="w-4 h-4 text-[#00e5ff]" />,
      action: () => { openInvestigation('INV-2048'); onClose(); },
    },

    // Cameras
    {
      id: 'cam-01',
      category: 'CAMERAS',
      title: 'Inspect CAM-01: North Main Lobby',
      subtitle: 'Axis Sector A • 1080p @ 30 FPS • 14ms latency',
      badge: 'ONLINE',
      icon: <Camera className="w-4 h-4 text-[#00e5ff]" />,
      action: () => { setActiveFeedTab('cameras'); setStage('HOME'); onClose(); },
    },
    {
      id: 'cam-07',
      category: 'CAMERAS',
      title: 'Inspect CAM-07: Overhead Sector A',
      subtitle: 'Workspace Alpha • 4K UHD @ 29.97 FPS • 24ms latency',
      badge: 'ONLINE',
      icon: <Camera className="w-4 h-4 text-[#00e5ff]" />,
      action: () => { setActiveFeedTab('cameras'); setStage('HOME'); onClose(); },
    },
    {
      id: 'cam-12',
      category: 'CAMERAS',
      title: 'Inspect CAM-12: High Mast Junction',
      subtitle: 'North Corridor Axis • 1080p @ 30 FPS • 19ms latency',
      badge: 'ONLINE',
      icon: <Camera className="w-4 h-4 text-[#00e5ff]" />,
      action: () => { setActiveFeedTab('cameras'); setStage('HOME'); onClose(); },
    },

    // Search targets
    {
      id: 'search-backpack',
      category: 'SEARCH',
      title: 'Search for "backpack"',
      subtitle: 'Initiate physical search across all connected camera feeds',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      action: () => { startSearchFlow('backpack'); onClose(); },
    },
    {
      id: 'search-laptop',
      category: 'SEARCH',
      title: 'Search for "laptop"',
      subtitle: 'Initiate physical search across all connected camera feeds',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      action: () => { startSearchFlow('laptop'); onClose(); },
    },
    {
      id: 'search-bottle',
      category: 'SEARCH',
      title: 'Search for "bottle"',
      subtitle: 'Initiate physical search across all connected camera feeds',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      action: () => { startSearchFlow('bottle'); onClose(); },
    },

    // Actions
    {
      id: 'action-role-admin',
      category: 'ACTIONS',
      title: 'Switch Role: SUPER ADMIN',
      subtitle: 'Grant full security operations, audit, and camera management clearance',
      badge: 'CLEARANCE',
      icon: <Sliders className="w-4 h-4 text-purple-400" />,
      action: () => { setCurrentUserRole('SUPER ADMIN'); onClose(); },
    },
    {
      id: 'action-role-operator',
      category: 'ACTIONS',
      title: 'Switch Role: OPERATOR',
      subtitle: 'Investigation docket, live scan control, and evidence sign-off clearance',
      badge: 'CLEARANCE',
      icon: <Sliders className="w-4 h-4 text-blue-400" />,
      action: () => { setCurrentUserRole('OPERATOR'); onClose(); },
    },
  ];

  const filtered = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0b0f19] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col font-sans select-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#0e1424]">
          <Search className="w-5 h-5 text-[#00e5ff] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search cameras, case numbers, objects, or command shortcuts..."
            className="flex-1 bg-transparent border-none outline-hidden text-sm text-white placeholder-slate-500 font-sans"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">
              NO MATCHING SURVEILLANCE OR SYSTEM COMMANDS FOUND
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#00e5ff]/15 border border-[#00e5ff]/30 text-white'
                      : 'hover:bg-white/5 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#00e5ff]/20' : 'bg-white/5'}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            item.badge === 'ACTIVE' || item.badge === 'ONLINE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.badge === 'SEARCHING'
                              ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30'
                              : 'bg-white/10 text-slate-300'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-500 truncate font-mono">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                    isSelected ? 'opacity-100 text-[#00e5ff]' : 'opacity-0'
                  }`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 bg-[#080b12] border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">ENTER</kbd> Select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">ESC</kbd> Close</span>
          </div>
          <span className="text-[#00e5ff]/80">CONTROL·F SOC GLOBAL SEARCH</span>
        </div>
      </div>
    </div>
  );
};
