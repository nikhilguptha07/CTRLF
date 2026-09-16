import React from 'react';
import { 
  FolderSearch, 
  Clock, 
  Camera, 
  ArrowRight,
  ShieldAlert,
  Search
} from 'lucide-react';
import type { ActiveInvestigation } from '../../types/commandCenter';

interface ActiveInvestigationsProps {
  investigations: ActiveInvestigation[];
  isLoading?: boolean;
  onSelectCase?: (caseItem: ActiveInvestigation) => void;
  onViewAllClick?: () => void;
  onStartSearchClick?: () => void;
}

export const ActiveInvestigations: React.FC<ActiveInvestigationsProps> = ({
  investigations,
  isLoading = false,
  onSelectCase,
  onViewAllClick,
  onStartSearchClick,
}) => {
  const getStatusBadge = (status: ActiveInvestigation['status']) => {
    switch (status) {
      case 'SEARCHING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            SEARCHING
          </span>
        );
      case 'ANALYZING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00c4df]/15 text-[#00c4df] border border-[#00c4df]/40 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c4df]" />
            ANALYZING
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/60 text-blue-300 border border-blue-800/60 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            IN PROGRESS
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shrink-0">
            RESOLVED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#161e2e] text-slate-300 border border-[#1a2536] shrink-0">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl bg-[#0f1520] border border-[#1a2536] shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-[#1a2536] flex items-center justify-between bg-[#161e2e]/50">
        <div className="flex items-center gap-2">
          <FolderSearch className="w-4 h-4 text-[#00c4df]" />
          <h2 className="text-xs font-bold text-slate-100 tracking-tight font-sans uppercase">
            Active Investigations
          </h2>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#161e2e] border border-[#1a2536] text-slate-400">
            {investigations.length} CASES
          </span>
        </div>
        {onViewAllClick && (
          <button
            type="button"
            onClick={onViewAllClick}
            className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span>Audit Trail</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 flex-1 flex flex-col justify-start">
        {isLoading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-2 rounded-lg bg-[#161e2e] border border-[#1a2536] animate-pulse h-14 flex items-center justify-between" />
            ))}
          </div>
        ) : investigations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 space-y-2 my-auto">
            <ShieldAlert className="w-7 h-7 text-slate-600" />
            <div className="text-xs font-medium text-slate-300 font-sans">
              No Active Investigations
            </div>
            <p className="text-[11px] text-slate-400 font-mono max-w-xs">
              All spatial object search requests are resolved. System standing by.
            </p>
            {onStartSearchClick && (
              <button
                type="button"
                onClick={onStartSearchClick}
                className="mt-1 px-3 py-1.5 bg-[#00c4df] hover:bg-[#00b2cb] text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Search className="w-3 h-3 text-slate-950" />
                <span>Launch Case</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {investigations.map((item) => (
              <div
                key={item.caseId}
                onClick={() => onSelectCase && onSelectCase(item)}
                className="p-2.5 rounded-lg border border-[#1a2536] bg-[#161e2e]/60 hover:bg-[#161e2e] hover:border-[#00c4df]/50 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-[#090d14] text-[10px] font-mono font-bold text-[#00c4df] border border-[#1a2536] shrink-0">
                    {item.caseId}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-100 truncate font-sans group-hover:text-[#00c4df] transition-colors">
                      {item.object}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      <span className="flex items-center gap-1">
                        <Camera className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{item.camera}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{item.lastDetectedTime}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] font-mono font-bold text-emerald-400">
                      {item.confidence}% Match
                    </div>
                    <div className="w-16 bg-slate-800 rounded-full h-1 overflow-hidden mt-0.5">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${item.confidence}%` }}
                      />
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
