import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  Camera, 
  Search, 
  Crosshair, 
  Activity, 
  ShieldCheck, 
  Table, 
  Settings,
  ArrowLeft 
} from 'lucide-react';

export type AdminTab = 
  | 'overview' 
  | 'database' 
  | 'users' 
  | 'cameras' 
  | 'sessions' 
  | 'detections' 
  | 'tracks' 
  | 'logs' 
  | 'explorer'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onReturnToDashboard: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  onReturnToDashboard,
}) => {
  const navItems: Array<{ id: AdminTab; label: string; icon: React.FC<any> }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'cameras', label: 'Camera Fabric', icon: Camera },
    { id: 'sessions', label: 'Search Sessions', icon: Search },
    { id: 'detections', label: 'Detections', icon: Crosshair },
    { id: 'tracks', label: 'Object Tracks', icon: Activity },
    { id: 'logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'explorer', label: 'Table Explorer', icon: Table },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="w-48 sm:w-56 border-r border-[#151f2e] p-3.5 flex flex-col justify-between shrink-0 bg-[#0a0f18] text-xs select-none font-sans">
      <div className="space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
          Admin Console
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#101927] text-[#00e5ff] border border-[#00e5ff]/30 shadow-xs font-bold'
                    : 'text-slate-400 hover:bg-[#0f1522] hover:text-slate-200 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00e5ff]' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom return link */}
      <div className="pt-4 border-t border-[#162134]">
        <button
          type="button"
          onClick={onReturnToDashboard}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-[#101726] hover:text-white transition-all text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Dashboard</span>
        </button>
      </div>
    </aside>
  );
};

