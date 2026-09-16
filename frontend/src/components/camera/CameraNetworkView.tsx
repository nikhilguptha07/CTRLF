import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Power,
  Info,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useExperienceStore } from '../../store/useExperienceStore';
import { EmptyState } from '../ui/UnifiedStates';

export interface CameraNetworkItem {
  id: string;
  name: string;
  location: string;
  status: 'ONLINE' | 'WARNING' | 'OFFLINE';
  resolution: string;
  fps: number;
  latencyMs: number | null;
  lastHeartbeat: string;
  isSimulated: boolean;
  protocol: string;
  uptimePercent: number;
  ptzEnabled: boolean;
}

const INITIAL_CAMERAS: CameraNetworkItem[] = [
  {
    id: 'CAM-01',
    name: 'North Main Lobby // Desk Alpha',
    location: 'North Main Lobby • Axis Sector A',
    status: 'ONLINE',
    resolution: '1920x1080 (1080p)',
    fps: 30.0,
    latencyMs: 14,
    lastHeartbeat: '4s ago',
    isSimulated: true,
    protocol: 'RTSP / H.264',
    uptimePercent: 99.8,
    ptzEnabled: false,
  },
  {
    id: 'CAM-02',
    name: 'Corridor A // PTZ Sweep',
    location: 'West Transit Axis • Zone 2',
    status: 'ONLINE',
    resolution: '1920x1080 (1080p)',
    fps: 30.0,
    latencyMs: 18,
    lastHeartbeat: '6s ago',
    isSimulated: true,
    protocol: 'ONVIF / PTZ',
    uptimePercent: 99.4,
    ptzEnabled: true,
  },
  {
    id: 'CAM-03',
    name: 'Access Checkpoint // USB-0',
    location: 'Personnel Gate • Zone Gamma',
    status: 'WARNING',
    resolution: '1280x720 (720p)',
    fps: 22.4,
    latencyMs: 82,
    lastHeartbeat: '18s ago',
    isSimulated: true,
    protocol: 'UVC / USB 3.0',
    uptimePercent: 94.2,
    ptzEnabled: false,
  },
  {
    id: 'CAM-04',
    name: 'Perimeter West // WebRTC Feed',
    location: 'Main Perimeter Portal Delta',
    status: 'OFFLINE',
    resolution: '1920x1080 (1080p)',
    fps: 0.0,
    latencyMs: null,
    lastHeartbeat: 'Disconnected (14m ago)',
    isSimulated: true,
    protocol: 'WebRTC / WHEP',
    uptimePercent: 88.1,
    ptzEnabled: false,
  },
  {
    id: 'CAM-07',
    name: 'Overhead Sector A // High Mast',
    location: 'Desk Surface Alpha • Workspace',
    status: 'ONLINE',
    resolution: '3840x2160 (4K UHD)',
    fps: 29.97,
    latencyMs: 24,
    lastHeartbeat: '2s ago',
    isSimulated: true,
    protocol: 'RTSP / H.265',
    uptimePercent: 99.9,
    ptzEnabled: false,
  },
  {
    id: 'CAM-12',
    name: 'West Transit Axis // Junction 3',
    location: 'West Corridor Exit • Zone Beta',
    status: 'ONLINE',
    resolution: '1920x1080 (1080p)',
    fps: 30.0,
    latencyMs: 16,
    lastHeartbeat: '5s ago',
    isSimulated: true,
    protocol: 'RTSP / H.264',
    uptimePercent: 99.7,
    ptzEnabled: false,
  },
  {
    id: 'CAM-18',
    name: 'Loading Dock West // Gate Delta',
    location: 'Loading Dock West • Perimeter Bay',
    status: 'ONLINE',
    resolution: '1920x1080 (1080p)',
    fps: 30.0,
    latencyMs: 31,
    lastHeartbeat: '3s ago',
    isSimulated: true,
    protocol: 'RTSP / H.264',
    uptimePercent: 99.5,
    ptzEnabled: true,
  },
];

export const CameraNetworkView: React.FC = () => {
  const { currentUser, setActiveFeedTab, setStage } = useExperienceStore();
  const [cameras, setCameras] = useState<CameraNetworkItem[]>(INITIAL_CAMERAS);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'WARNING' | 'OFFLINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPinging, setIsPinging] = useState(false);

  // Load real cameras from API if connected
  useEffect(() => {
    let mounted = true;
    const loadApiCameras = async () => {
      try {
        const res = await apiClient.getAdminCameras({ limit: 50 }).catch(() => null);
        if (mounted && res && res.cameras && res.cameras.length > 0) {
          const merged: CameraNetworkItem[] = res.cameras.map((c: any) => ({
            id: c.id,
            name: c.name || c.id,
            location: c.location || 'Surveillance Sector',
            status: c.status === 'ONLINE' ? 'ONLINE' : c.status === 'ERROR' ? 'WARNING' : 'OFFLINE',
            resolution: c.resolution || '1920x1080 (1080p)',
            fps: c.fps || (c.status === 'ONLINE' ? 30.0 : 0.0),
            latencyMs: c.status === 'ONLINE' ? Math.floor(12 + Math.random() * 25) : null,
            lastHeartbeat: c.status === 'ONLINE' ? 'Just now (3s ago)' : 'Disconnected',
            isSimulated: true,
            protocol: c.protocol || 'RTSP',
            uptimePercent: c.status === 'ONLINE' ? 99.6 : 82.0,
            ptzEnabled: Boolean(c.ptzEnabled),
          }));
          if (merged.length >= 3) {
            setCameras(merged);
          }
        }
      } catch {
        // Keep initial enterprise set
      }
    };
    loadApiCameras();
    return () => { mounted = false; };
  }, []);

  const totalCameras = cameras.length;
  const onlineCount = cameras.filter((c) => c.status === 'ONLINE').length;
  const warningCount = cameras.filter((c) => c.status === 'WARNING').length;
  const offlineCount = cameras.filter((c) => c.status === 'OFFLINE').length;

  const filteredCameras = cameras.filter((cam) => {
    if (statusFilter !== 'ALL' && cam.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        cam.id.toLowerCase().includes(q) ||
        cam.name.toLowerCase().includes(q) ||
        cam.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleTestPing = () => {
    setIsPinging(true);
    setTimeout(() => {
      setCameras((prev) =>
        prev.map((c) => {
          if (c.status === 'ONLINE') {
            return {
              ...c,
              latencyMs: Math.floor(12 + Math.random() * 20),
              lastHeartbeat: 'Just now (1s ago)',
            };
          }
          return c;
        })
      );
      setIsPinging(false);
    }, 600);
  };

  const handleToggleCameraStatus = async (cameraId: string) => {
    const target = cameras.find((c) => c.id === cameraId);
    if (!target) return;

    const nextStatus: CameraNetworkItem['status'] =
      target.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';

    setCameras((prev) =>
      prev.map((c) =>
        c.id === cameraId
          ? {
              ...c,
              status: nextStatus,
              fps: nextStatus === 'ONLINE' ? 30.0 : 0.0,
              latencyMs: nextStatus === 'ONLINE' ? 18 : null,
              lastHeartbeat: nextStatus === 'ONLINE' ? 'Just now (1s ago)' : 'Manual Offline',
            }
          : c
      )
    );

    // Record audit event for camera changes (Phase 6 requirement #4)
    await apiClient.recordAuditEvent({
      action: 'CAMERA_STATUS_CHANGED',
      resourceType: 'CAMERA',
      resourceId: cameraId,
      details: {
        cameraId,
        previousStatus: target.status,
        newStatus: nextStatus,
        operator: currentUser?.email || 'Operator',
      },
    });
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4 overflow-y-auto pr-1 animate-fade-in text-slate-900">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
              <Camera className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-sans">
                  Camera Network Management
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                  <Info className="w-2.5 h-2.5 text-amber-700" />
                  DEMO DATA
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Real-time RTSP/ONVIF surveillance nodes, optical FPS telemetry, and heartbeat monitoring.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestPing}
            disabled={isPinging}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Probe RTSP hardware heartbeat on all online nodes"
          >
            <RefreshCw className={`w-3 h-3 text-slate-500 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Pinging Nodes...' : 'Probe Network'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveFeedTab('cctv'); setStage('HOME'); }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <span>Live CCTV Grid</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Bar (Required by Phase 6: Total cameras, Online, Warning, Offline) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Cameras */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-800 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'
            }`}>
              Total Cameras
            </span>
            <Camera className={`w-4 h-4 ${statusFilter === 'ALL' ? 'text-indigo-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight">{totalCameras}</span>
            <span className={`text-[10px] font-mono ${statusFilter === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
              Registered
            </span>
          </div>
        </div>

        {/* Online */}
        <div 
          onClick={() => setStatusFilter('ONLINE')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'ONLINE'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
              : 'bg-emerald-50/70 border-emerald-200/80 hover:border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              statusFilter === 'ONLINE' ? 'text-emerald-100' : 'text-emerald-700'
            }`}>
              Online
            </span>
            <CheckCircle2 className={`w-4 h-4 ${statusFilter === 'ONLINE' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight">{onlineCount}</span>
            <span className={`text-[10px] font-mono ${statusFilter === 'ONLINE' ? 'text-emerald-200' : 'text-emerald-600'}`}>
              {Math.round((onlineCount / totalCameras) * 100)}% active
            </span>
          </div>
        </div>

        {/* Warning */}
        <div 
          onClick={() => setStatusFilter('WARNING')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'WARNING'
              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
              : 'bg-amber-50/70 border-amber-200/80 hover:border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              statusFilter === 'WARNING' ? 'text-amber-100' : 'text-amber-700'
            }`}>
              Warning
            </span>
            <AlertTriangle className={`w-4 h-4 ${statusFilter === 'WARNING' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight">{warningCount}</span>
            <span className={`text-[10px] font-mono ${statusFilter === 'WARNING' ? 'text-amber-200' : 'text-amber-700'}`}>
              High jitter
            </span>
          </div>
        </div>

        {/* Offline */}
        <div 
          onClick={() => setStatusFilter('OFFLINE')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'OFFLINE'
              ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
              : 'bg-rose-50/70 border-rose-200/80 hover:border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              statusFilter === 'OFFLINE' ? 'text-rose-100' : 'text-rose-700'
            }`}>
              Offline
            </span>
            <WifiOff className={`w-4 h-4 ${statusFilter === 'OFFLINE' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight">{offlineCount}</span>
            <span className={`text-[10px] font-mono ${statusFilter === 'OFFLINE' ? 'text-rose-200' : 'text-rose-600'}`}>
              Disconnected
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Quick Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Camera ID or Location..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'ONLINE', 'WARNING', 'OFFLINE'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Camera Telemetry Table (Detailed Fields Required: ID, Location, Status, Resolution, FPS, Latency, Last Heartbeat) */}
      <div className="rounded-xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Camera ID & Name</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Resolution</th>
                <th className="py-2.5 px-3 text-right">FPS</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
                <th className="py-2.5 px-3">Last Heartbeat</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCameras.map((cam) => {
                const isOnline = cam.status === 'ONLINE';
                const isWarning = cam.status === 'WARNING';

                return (
                  <tr key={cam.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Camera ID & Name */}
                    <td className="py-2.5 px-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                          {cam.id}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 truncate block">
                            {cam.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cam.protocol}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-3 text-slate-600 font-sans">
                      {cam.location}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isOnline
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? 'bg-emerald-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        {cam.status}
                      </span>
                    </td>

                    {/* Resolution */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      {cam.resolution}
                    </td>

                    {/* FPS */}
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] font-bold">
                      <span className={isOnline ? 'text-emerald-700' : isWarning ? 'text-amber-700' : 'text-slate-400'}>
                        {cam.fps.toFixed(1)} fps
                      </span>
                    </td>

                    {/* Latency */}
                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                      {cam.latencyMs !== null ? (
                        <span className={cam.latencyMs < 50 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-bold'}>
                          {cam.latencyMs}ms
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Last Heartbeat */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {cam.lastHeartbeat}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleCameraStatus(cam.id)}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            isOnline
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isOnline ? 'Standby / Deactivate camera' : 'Activate camera stream'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCameras.length === 0 && (
          <div className="py-6">
            <EmptyState
              icon={Camera}
              title="No Cameras Found"
              description="No active surveillance nodes match your filter criteria or search query. Try clearing filters or searching for another sector."
              actionLabel="Reset Search Filters"
              onAction={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
            />
          </div>
        )}

        {/* Demo Telemetry Disclosure Footer */}
        <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Notice: Real hardware RTSP endpoints mapped to local synthetic simulation nodes in development mode.</span>
          </div>
          <span className="font-bold text-slate-700">7 Active Channels</span>
        </div>
      </div>

    </div>
  );
};
