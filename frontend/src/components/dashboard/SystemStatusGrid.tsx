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
            className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/60 animate-pulse h-20 flex flex-col justify-between"
          >
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-2.5 w-12 bg-slate-200 rounded" />
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
        className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
        title="View live camera grid"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cams Online</span>
          </div>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <div className="my-1 flex items-baseline gap-1">
          <span className="text-lg font-extrabold text-slate-900 font-mono tracking-tight">
            {status.camerasOnline}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">FEEDS</span>
        </div>
        <div className="text-[10px] text-emerald-700 font-semibold font-mono truncate flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>OPERATIONAL</span>
        </div>
      </div>

      {/* 2. Cameras Offline */}
      <div 
        onClick={onCameraClick}
        className={`p-2.5 rounded-xl border shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
          status.camerasOffline > 0 
            ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300' 
            : 'bg-white border-slate-200/80 hover:border-slate-300'
        }`}
        title="Offline camera alerts"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className={`w-3.5 h-3.5 ${status.camerasOffline > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>Cams Offline</span>
          </div>
          {status.camerasOffline > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
              ALERT
            </span>
          )}
        </div>
        <div className="my-1 flex items-baseline gap-1">
          <span className={`text-lg font-extrabold font-mono tracking-tight ${status.camerasOffline > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
            {status.camerasOffline}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">STREAMS</span>
        </div>
        <div className={`text-[10px] font-mono truncate ${status.camerasOffline > 0 ? 'text-rose-600 font-bold' : 'text-slate-400 font-medium'}`}>
          {status.camerasOffline > 0 ? 'CAM-04 DROPPED' : 'ALL SYNCHRONIZED'}
        </div>
      </div>

      {/* 3. AI Engine Status */}
      <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Engine</span>
          </div>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            {status.aiEngineStatus}
          </span>
        </div>
        <div className="my-1 text-sm font-bold text-slate-900 truncate font-mono tracking-tight">
          YOLOv8x
        </div>
        <div className="text-[10px] text-slate-500 font-mono truncate">
          ByteTrack • 80-Class
        </div>
      </div>

      {/* 4. Storage Status */}
      <div 
        onClick={onStorageClick}
        className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
        title="Inspect storage pool"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-600" />
            <span>Storage NVMe</span>
          </div>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
            {status.storageUsagePercent}%
          </span>
        </div>
        <div className="my-1 flex items-baseline gap-1">
          <span className="text-base font-bold text-slate-900 font-mono tracking-tight truncate">
            1.26 TB
          </span>
          <span className="text-[10px] text-slate-400 font-mono">/ 1.5TB</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full ${status.storageUsagePercent > 80 ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.min(100, status.storageUsagePercent)}%` }}
          />
        </div>
      </div>

      {/* 5. Last Detection */}
      <div 
        onClick={onDetectionClick}
        className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
        title="Inspect last detection event"
      >
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            <span>Last Detection</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">
            {status.lastDetection ? status.lastDetection.timestamp : 'N/A'}
          </span>
        </div>
        <div className="my-1 text-sm font-bold text-slate-900 truncate font-sans">
          {status.lastDetection ? status.lastDetection.object : 'No Detections'}
        </div>
        <div className="text-[10px] text-slate-500 font-mono truncate">
          {status.lastDetection ? `${status.lastDetection.camera} (${status.lastDetection.confidence}%)` : 'Idle'}
        </div>
      </div>

      {/* 6. Processing Status */}
      <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Processing</span>
          </div>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            60 FPS
          </span>
        </div>
        <div className="my-1 text-xs font-bold text-slate-900 uppercase font-mono tracking-wider truncate flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>INFERENCE</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono truncate">
          Latency: {status.latencyMs}ms • Realtime
        </div>
      </div>
    </div>
  );
};
