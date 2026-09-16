import React from 'react';
import { 
  Camera, 
  Cpu, 
  HardDrive, 
  Activity, 
  Target, 
  AlertTriangle 
} from 'lucide-react';
import type { SystemStatus } from '../../types/commandCenter';

interface SystemStatusGridProps {
  status: SystemStatus;
  isLoading?: boolean;
  onCameraClick?: () => void;
  onStorageClick?: () => void;
  onDetectionClick?: () => void;
}

export const SystemStatusGrid: React.FC<SystemStatusGridProps> = ({
  status,
  isLoading = false,
  onCameraClick,
  onStorageClick,
  onDetectionClick,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            className="p-2.5 rounded-xl bg-[#161e2e] border border-[#1a2536] animate-pulse h-20 flex flex-col justify-between"
          >
            <div className="h-3 w-16 bg-[#1a2536] rounded" />
            <div className="h-4 w-20 bg-[#1a2536] rounded" />
            <div className="h-2.5 w-12 bg-[#1a2536] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {/* 1. Cameras Online */}
      <div 
        onClick={onCameraClick}
        className="p-2.5 rounded-xl bg-[#0f1520] border border-[#1a2536] shadow-2xs hover:border-[#00c4df]/50 transition-all cursor-pointer group flex flex-col justify-between"
        title="View live camera grid"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#00c4df]" />
            <span>Cams Online</span>
          </div>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c4df] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00c4df]" />
          </span>
        </div>
        <div className="my-1 flex items-baseline gap-1">
          <span className="text-lg font-extrabold text-slate-100 font-mono tracking-tight">
            {status.camerasOnline}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">FEEDS</span>
        </div>
        <div className="text-[10px] text-[#00c4df] font-semibold font-mono truncate flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00c4df]" />
          <span>OPERATIONAL</span>
        </div>
      </div>

      {/* 2. Cameras Offline */}
      <div 
        onClick={onCameraClick}
        className={`p-2.5 rounded-xl border shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
          status.camerasOffline > 0 
            ? 'bg-rose-950/30 border-rose-800/60 hover:border-rose-600/80' 
            : 'bg-[#0f1520] border-[#1a2536] hover:border-[#00c4df]/50'
        }`}
        title="Offline camera alerts"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className={`w-3.5 h-3.5 ${status.camerasOffline > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            <span>Cams Offline</span>
          </div>
          {status.camerasOffline > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
              ALERT
            </span>
          )}
        </div>
        <div className="my-1 flex items-baseline gap-1">
          <span className={`text-lg font-extrabold font-mono tracking-tight ${status.camerasOffline > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
            {status.camerasOffline}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">STREAMS</span>
        </div>
        <div className={`text-[10px] font-mono truncate ${status.camerasOffline > 0 ? 'text-rose-400 font-bold' : 'text-slate-400 font-medium'}`}>
          {status.camerasOffline > 0 ? 'CAM-04 DROPPED' : 'ALL SYNCHRONIZED'}
        </div>
      </div>

      {/* 3. AI Engine Status */}
      <div className="p-2.5 rounded-xl bg-[#0f1520] border border-[#1a2536] shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#00c4df]" />
            <span>AI Engine</span>
          </div>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#00c4df]/10 text-[#00c4df] border border-[#00c4df]/30">
            {status.aiEngineStatus}
          </span>
        </div>
        <div className="my-1 text-sm font-bold text-slate-100 truncate font-mono tracking-tight">
          YOLOv8x
        </div>
        <div className="text-[10px] text-slate-400 font-mono truncate">
          ByteTrack • 80-Class
        </div>
      </div>

      {/* 4. Storage Status */}
      <div 
        onClick={onStorageClick}
        className="p-2.5 rounded-xl bg-[#0f1520] border border-[#1a2536] shadow-2xs hover:border-[#00c4df]/50 transition-all cursor-pointer flex flex-col justify-between"
        title="Inspect storage pool"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>Storage NVMe</span>
          </div>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
            {status.storageUsagePercent}%
          </span>
        </div>
        <div className="my-1 flex items-baseline gap-1">
          <span className="text-base font-bold text-slate-100 font-mono tracking-tight truncate">
            1.26 TB
          </span>
          <span className="text-[10px] text-slate-400 font-mono">/ 1.5TB</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full ${status.storageUsagePercent > 80 ? 'bg-amber-500' : 'bg-[#00c4df]'}`}
            style={{ width: `${Math.min(100, status.storageUsagePercent)}%` }}
          />
        </div>
      </div>

      {/* 5. Last Detection */}
      <div 
        onClick={onDetectionClick}
        className="p-2.5 rounded-xl bg-[#0f1520] border border-[#1a2536] shadow-2xs hover:border-[#00c4df]/50 transition-all cursor-pointer flex flex-col justify-between"
        title="Inspect last detection event"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#00c4df]" />
            <span>Last Detection</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">
            {status.lastDetection ? status.lastDetection.timestamp : 'N/A'}
          </span>
        </div>
        <div className="my-1 text-sm font-bold text-slate-100 truncate font-sans">
          {status.lastDetection ? status.lastDetection.object : 'No Detections'}
        </div>
        <div className="text-[10px] text-slate-400 font-mono truncate">
          {status.lastDetection ? `${status.lastDetection.camera} (${status.lastDetection.confidence}%)` : 'Idle'}
        </div>
      </div>

      {/* 6. Processing Status */}
      <div className="p-2.5 rounded-xl bg-[#0f1520] border border-[#1a2536] shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Processing</span>
          </div>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            60 FPS
          </span>
        </div>
        <div className="my-1 text-xs font-bold text-slate-100 uppercase font-mono tracking-wider truncate flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>INFERENCE</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono truncate">
          Latency: {status.latencyMs}ms • Realtime
        </div>
      </div>
    </div>
  );
};
