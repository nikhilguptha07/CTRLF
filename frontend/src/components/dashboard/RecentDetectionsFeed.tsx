import React from 'react';
import { 
  Eye, 
  Camera, 
  MapPin, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import type { RecentDetection } from '../../types/commandCenter';

interface RecentDetectionsFeedProps {
  detections: RecentDetection[];
  isLoading?: boolean;
  onDetectionClick?: (detection: RecentDetection) => void;
  onViewAllClick?: () => void;
}

export const RecentDetectionsFeed: React.FC<RecentDetectionsFeedProps> = ({
  detections,
  isLoading = false,
  onDetectionClick,
  onViewAllClick,
}) => {
  const getStatusPill = (status: RecentDetection['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
            <span>CONFIRMED</span>
          </span>
        );
      case 'UNRESOLVED':
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 shrink-0">
            <HelpCircle className="w-2.5 h-2.5 text-blue-600" />
            <span>UNRESOLVED</span>
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
            <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
            <span>FLAGGED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold text-slate-900 tracking-tight font-sans uppercase">
            Recent Detections
          </h2>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-600">
            LIVE FEED
          </span>
        </div>
        {onViewAllClick && (
          <button
            type="button"
            onClick={onViewAllClick}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span>Detection History</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 flex-1 flex flex-col justify-start">
        {isLoading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-2 rounded-lg bg-slate-100/70 animate-pulse h-12 flex items-center gap-2.5" />
            ))}
          </div>
        ) : detections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 space-y-1 my-auto">
            <Eye className="w-7 h-7 text-slate-300" />
            <div className="text-xs font-medium text-slate-600 font-sans">
              No Recent Detections
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Surveillance cameras have not registered candidate targets yet.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {detections.map((item) => (
              <div
                key={item.id}
                onClick={() => onDetectionClick && onDetectionClick(item)}
                className="p-2 rounded-lg border border-slate-200/70 bg-white hover:bg-slate-50/80 hover:border-slate-300 transition-all cursor-pointer group flex items-center justify-between gap-2.5 shadow-2xs"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shrink-0 relative flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img 
                        src={item.thumbnailUrl} 
                        alt={item.object} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          // Fallback to stylized high-contrast icon if image fails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="text-[11px] font-mono font-bold text-slate-300">
                      {item.object.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate font-sans group-hover:text-indigo-600 transition-colors">
                        {item.object}
                      </span>
                      {item.color && (
                        <span className="text-[9px] font-mono text-slate-400">
                          ({item.color})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      <span className="flex items-center gap-0.5">
                        <Camera className="w-3 h-3 text-slate-400" />
                        <span>{item.camera}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Confidence, Time & Status */}
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-emerald-700">
                      {item.confidence}%
                    </span>
                    {getStatusPill(item.status)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>{item.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
