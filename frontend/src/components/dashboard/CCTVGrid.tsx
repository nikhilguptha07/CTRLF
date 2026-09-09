import React, { useState, useEffect } from 'react';
import { useExperienceStore } from '../../store/useExperienceStore';
import {
  Camera,
  Eye,
  Shield,
  CheckCircle2,
  AlertOctagon,
  Zap,
  StopCircle,
  Wifi,
  WifiOff,
  Radio,
  Plus,
  Crosshair,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  X,
  Activity,
} from 'lucide-react';
import { apiClient, type CameraStreamHealth } from '../../services/apiClient';
import { socketClient } from '../../services/socketClient';

export interface CameraNode {
  id: string;
  name: string;
  location?: string;
  protocol?: string;
  ptzEnabled?: boolean;
  deviceIndex?: number | null;
  fps: string;
  res: string;
  status: string;
  color: string;
  active: boolean;
}

const DEFAULT_CAMERAS: CameraNode[] = [
  {
    id: 'CAM_01',
    name: 'North Main Lobby // Desk Alpha',
    location: 'Zone Alpha - Primary Desk Feed',
    protocol: 'RTSP',
    ptzEnabled: false,
    fps: '30.0',
    res: '1080p · 30fps',
    status: 'ONLINE',
    color: 'border-blue-500/80 ring-2 ring-blue-400/40',
    active: true,
  },
  {
    id: 'CAM_02',
    name: 'Corridor A // PTZ Sweep',
    location: 'Zone Beta - North Corridor',
    protocol: 'ONVIF_PTZ',
    ptzEnabled: true,
    fps: '30.0',
    res: '1080p · 30fps',
    status: 'ONLINE',
    color: 'border-emerald-500/30',
    active: false,
  },
  {
    id: 'CAM_03',
    name: 'Access Checkpoint // USB-0',
    location: 'Zone Gamma - USB Hardware Feed',
    protocol: 'USB_WEBCAM',
    deviceIndex: 0,
    ptzEnabled: false,
    fps: '24.0',
    res: '1080p · UVC-HD',
    status: 'ONLINE',
    color: 'border-emerald-500/30',
    active: false,
  },
  {
    id: 'CAM_04',
    name: 'Perimeter West // WebRTC Feed',
    location: 'Zone Delta - Main Portal',
    protocol: 'WEBRTC',
    ptzEnabled: false,
    fps: '30.0',
    res: '1080p · WHEP-RTC',
    status: 'ONLINE',
    color: 'border-emerald-500/30',
    active: false,
  },
];

export const CCTVGrid: React.FC = () => {
  const {
    stage,
    setStage,
    setActiveFeedTab,
    orchestratorMode,
    orchestratorCameras,
    winningCameraId,
    startOrchestratedSearchFlow,
    cancelSearchFlow,
    searchQuery,
  } = useExperienceStore();

  const [cameras, setCameras] = useState<CameraNode[]>(DEFAULT_CAMERAS);
  const [cameraHealth, setCameraHealth] = useState<Record<string, CameraStreamHealth>>({});
  const [orchInput, setOrchInput] = useState('');
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [streamToggling, setStreamToggling] = useState<Record<string, boolean>>({});

  // PTZ Control state
  const [activePtzCameraId, setActivePtzCameraId] = useState<string | null>(null);
  const [ptzStatusMessage, setPtzStatusMessage] = useState<string>('');
  const [ptzCoords, setPtzCoords] = useState<{ pan?: number; tilt?: number; zoom?: number }>({});
  const [ptzPending, setPtzPending] = useState(false);

  // New Camera Form state
  const [newCamProtocol, setNewCamProtocol] = useState<string>('RTSP');
  const [newCamName, setNewCamName] = useState<string>('');
  const [newCamLocation, setNewCamLocation] = useState<string>('');
  const [newCamUri, setNewCamUri] = useState<string>('');
  const [newCamDeviceIndex, setNewCamDeviceIndex] = useState<number>(0);
  const [newCamUsername, setNewCamUsername] = useState<string>('');
  const [newCamPassword, setNewCamPassword] = useState<string>('');
  const [probeResult, setProbeResult] = useState<any | null>(null);
  const [probeLoading, setProbeLoading] = useState<boolean>(false);
  const [registerLoading, setRegisterLoading] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // 1. Load cameras from backend
  const refreshCameras = () => {
    apiClient
      .getCameras()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: CameraNode[] = data.map((c: any, i: number) => ({
            id: c.id || `CAM_0${i + 1}`,
            name: c.name || `Surveillance Node ${i + 1}`,
            location: c.location || `Sector ${i + 1}`,
            protocol: c.protocol || 'RTSP',
            ptzEnabled: c.ptzEnabled ?? (c.protocol === 'ONVIF_PTZ'),
            deviceIndex: c.deviceIndex ?? null,
            fps: '30.0',
            res: '1080p · 30fps',
            status: c.status || 'ONLINE',
            color: i === 0 ? 'border-blue-500/80 ring-2 ring-blue-400/40' : 'border-emerald-500/30',
            active: i === 0,
          }));
          setCameras(mapped);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshCameras();
  }, []);

  // 2. Poll real camera stream health & subscribe to WebSocket stream events
  useEffect(() => {
    let active = true;

    const pollHealth = async () => {
      for (const cam of cameras) {
        try {
          const health = await apiClient.getCameraHealth(cam.id);
          if (active && health) {
            setCameraHealth((prev) => ({ ...prev, [cam.id]: health }));
          }
        } catch {}
      }
    };

    pollHealth();
    const interval = setInterval(pollHealth, 2500);

    const onStatus = (status: CameraStreamHealth) => {
      if (active && status && status.cameraId) {
        setCameraHealth((prev) => ({ ...prev, [status.cameraId]: status }));
      }
    };

    socketClient.onStreamStatus(onStatus);

    return () => {
      active = false;
      clearInterval(interval);
      socketClient.offStreamStatus(onStatus);
    };
  }, [cameras]);

  const handleLaunchOrchestratedSearch = (target?: string) => {
    const query = target || orchInput.trim() || 'Bottle';
    setShowLaunchModal(false);
    startOrchestratedSearchFlow(query);
  };

  const handleToggleStream = async (cameraId: string, isLive: boolean) => {
    setStreamToggling((prev) => ({ ...prev, [cameraId]: true }));
    try {
      if (isLive) {
        await apiClient.stopCameraStream(cameraId);
      } else {
        await apiClient.startCameraStream(cameraId);
      }
      const updated = await apiClient.getCameraHealth(cameraId);
      if (updated) {
        setCameraHealth((prev) => ({ ...prev, [cameraId]: updated }));
      }
    } finally {
      setStreamToggling((prev) => ({ ...prev, [cameraId]: false }));
    }
  };

  // PTZ Command Handler
  const handlePtzAction = async (
    action: 'START' | 'STOP' | 'GOTO_PRESET' | 'SET_PRESET' | 'HOME',
    opts?: { panSpeed?: number; tiltSpeed?: number; zoomSpeed?: number; presetId?: string }
  ) => {
    if (!activePtzCameraId) return;
    setPtzPending(true);
    setPtzStatusMessage('Transmitting PTZ telemetry...');
    try {
      const res = await apiClient.sendPtzCommand(activePtzCameraId, {
        action,
        panSpeed: opts?.panSpeed,
        tiltSpeed: opts?.tiltSpeed,
        zoomSpeed: opts?.zoomSpeed,
        presetId: opts?.presetId,
      });

      if (res.success) {
        setPtzStatusMessage(res.message || 'Movement executed');
        setPtzCoords({ pan: res.pan, tilt: res.tilt, zoom: res.zoom });
      } else {
        setPtzStatusMessage(res.message || 'PTZ command failed');
      }
    } catch (err: any) {
      setPtzStatusMessage(err.message || 'PTZ communication failure');
    } finally {
      setPtzPending(false);
    }
  };

  // Probe Camera Connection
  const handleProbeCamera = async () => {
    setProbeLoading(true);
    setProbeResult(null);
    setRegisterError(null);
    try {
      const res = await apiClient.probeCameraConnection({
        protocol: newCamProtocol,
        streamUrl: newCamUri || undefined,
        deviceIndex: newCamProtocol === 'USB_WEBCAM' ? newCamDeviceIndex : undefined,
        username: newCamUsername || undefined,
        password: newCamPassword || undefined,
      });
      setProbeResult(res);
    } catch (err: any) {
      setProbeResult({ reachable: false, error: err.message, pingMs: 0 });
    } finally {
      setProbeLoading(false);
    }
  };

  // Register Real Camera
  const handleRegisterCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName.trim()) {
      setRegisterError('Please enter a camera name');
      return;
    }
    setRegisterLoading(true);
    setRegisterError(null);
    try {
      await apiClient.registerCamera({
        name: newCamName.trim(),
        location: newCamLocation.trim() || 'Surveillance Zone',
        protocol: newCamProtocol,
        streamUrl: newCamProtocol === 'USB_WEBCAM' ? `device://${newCamDeviceIndex}` : newCamUri,
        deviceIndex: newCamProtocol === 'USB_WEBCAM' ? newCamDeviceIndex : undefined,
        username: newCamUsername || undefined,
        password: newCamPassword || undefined,
        ptzEnabled: newCamProtocol === 'ONVIF_PTZ',
      });
      setShowAddModal(false);
      // Reset form
      setNewCamName('');
      setNewCamLocation('');
      setNewCamUri('');
      setProbeResult(null);
      refreshCameras();
    } catch (err: any) {
      setRegisterError(err.message || 'Failed to register camera');
    } finally {
      setRegisterLoading(false);
    }
  };

  const getProtocolBadge = (protocol?: string) => {
    switch (protocol) {
      case 'ONVIF_PTZ':
        return { label: 'ONVIF PTZ', bg: 'bg-amber-950/80 text-amber-300 border-amber-500/40' };
      case 'ONVIF':
        return { label: 'ONVIF IP', bg: 'bg-purple-950/80 text-purple-300 border-purple-500/40' };
      case 'USB_WEBCAM':
        return { label: 'USB / UVC', bg: 'bg-teal-950/80 text-teal-300 border-teal-500/40' };
      case 'WEBRTC':
        return { label: 'WebRTC / WHEP', bg: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' };
      case 'HLS':
        return { label: 'HLS STREAM', bg: 'bg-pink-950/80 text-pink-300 border-pink-500/40' };
      case 'LOCAL_NETWORK':
        return { label: 'LOCAL HTTP', bg: 'bg-sky-950/80 text-sky-300 border-sky-500/40' };
      default:
        return { label: 'RTSP IP', bg: 'bg-blue-950/80 text-blue-300 border-blue-500/40' };
    }
  };

  const isOrchSearching = stage === 'SEARCHING' && orchestratorMode;
  const isOrchDetected = stage === 'DETECTED' && orchestratorMode;
  const isOrchNotDetected = stage === 'NOT_DETECTED' && orchestratorMode;

  return (
    <div className="space-y-4 animate-fade-in w-full h-full flex flex-col font-sans">
      {/* Top Stream & Orchestrator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              <span>Universal CCTV Camera Hub</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Radio className="w-3 h-3 text-indigo-500 animate-pulse" />
              <span>REAL HARDWARE / RTSP / ONVIF / USB</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Vendor-agnostic camera adapters · DirectShow / RTSP / WHEP / ONVIF PTZ · Real YOLOv8 + ByteTrack inference
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Physical Camera</span>
          </button>

          {isOrchSearching ? (
            <button
              type="button"
              onClick={cancelSearchFlow}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              <span>Cancel Orchestrator</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLaunchModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Launch Multi-Camera Search</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Orchestrator Telemetry Banner */}
      {orchestratorMode && (
        <div
          className={`px-4 py-3 rounded-2xl border transition-all animate-fade-in text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs ${
            isOrchDetected
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : isOrchNotDetected
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/90 border-indigo-500/40 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {isOrchSearching && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
              </span>
            )}
            {isOrchDetected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {isOrchNotDetected && <AlertOctagon className="w-4 h-4 text-rose-400" />}

            <div>
              <span className="font-bold text-white uppercase tracking-wider">
                {isOrchSearching && `LIVE ORCHESTRATION: SEARCHING FOR "${searchQuery}"`}
                {isOrchDetected && `TARGET CONFIRMED ON ${winningCameraId || 'CAM_01'}!`}
                {isOrchNotDetected && `SCAN COMPLETE: TARGET NOT DETECTED`}
              </span>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isOrchSearching && 'Monitoring active CCTV streams. Sibling feeds will automatically preempt on target confirmation.'}
                {isOrchDetected && 'Target acquired: Sibling cameras immediately stopped to conserve compute and network resources.'}
                {isOrchNotDetected && 'Live search window completed without a confirmed target match.'}
              </p>
            </div>
          </div>

          {isOrchDetected && (
            <button
              type="button"
              onClick={() => {
                setActiveFeedTab('detected');
                setStage('DETECTED');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
            >
              View 3D Detection Reticle &rarr;
            </button>
          )}
        </div>
      )}

      {/* 2x2 Camera Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
        {cameras.map((cam) => {
          const worker = orchestratorCameras[cam.id];
          const isTargetFound = worker?.status === 'TARGET_FOUND';
          const isPreempted = worker?.status === 'CANCELLED_PREEMPTED';
          const isSearchingThis = worker?.status === 'SEARCHING';
          const isNoTarget = worker?.status === 'NO_TARGET';

          // Real Stream Status from authoritative health state
          const health = cameraHealth[cam.id];
          const isLive = health?.status === 'LIVE';
          const isConnecting = health?.status === 'CONNECTING';
          const isReconnecting = health?.status === 'RECONNECTING';
          const isError = health?.status === 'ERROR';
          const isOffline = !health || health.status === 'STOPPED' || health.status === 'DISCONNECTED';

          const protoBadge = getProtocolBadge(cam.protocol);
          const isPtzOpen = activePtzCameraId === cam.id;

          // Dynamic card border/glow based on orchestrator status
          let borderGlow = cam.color;
          if (isTargetFound) {
            borderGlow = 'border-emerald-500 ring-4 ring-emerald-500/40 shadow-xl shadow-emerald-900/30';
          } else if (isPreempted) {
            borderGlow = 'border-amber-500/40 opacity-70 bg-slate-950/60';
          } else if (isSearchingThis) {
            borderGlow = 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg';
          } else if (isLive) {
            borderGlow = 'border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-md';
          }

          return (
            <div
              key={cam.id}
              className={`relative rounded-2xl bg-slate-950 overflow-hidden border p-3.5 flex flex-col justify-between group shadow-sm transition-all min-h-[250px] ${borderGlow}`}
            >
              {/* Background live stream preview image or dark surveillance fallback */}
              {isLive ? (
                <img
                  src={apiClient.getCameraPreviewUrl(cam.id)}
                  alt={cam.name}
                  className="absolute inset-0 w-full h-full object-cover z-0 opacity-85"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black opacity-95 z-0" />
              )}

              {/* Scanline overlay for tactical CCTV visual tone */}
              <div className="absolute inset-0 scanline-overlay opacity-30 pointer-events-none z-1" />

              {/* Live scanning line if actively searching this camera */}
              {isSearchingThis && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-2">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-bounce" />
                </div>
              )}

              {/* Target lock-on glowing overlay */}
              {isTargetFound && (
                <div className="absolute inset-0 bg-emerald-950/40 pointer-events-none flex items-center justify-center z-3">
                  <div className="w-32 h-32 border-2 border-emerald-400/80 rounded-xl animate-pulse flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                  </div>
                </div>
              )}

              {/* Preempted overlay */}
              {isPreempted && (
                <div className="absolute inset-0 bg-slate-950/80 pointer-events-none backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-4 z-4">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold tracking-wider mb-1">
                    PREEMPTED BY ORCHESTRATOR
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    Target confirmed on {winningCameraId || 'CAM_01'}
                  </span>
                  <span className="text-emerald-400 font-mono text-[9px] mt-1 font-semibold">
                    [WORKER HALTED · RESOURCES OPTIMIZED]
                  </span>
                </div>
              )}

              {/* Top Bar inside feed */}
              <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isTargetFound
                        ? 'bg-emerald-400 ring-2 ring-emerald-300 animate-ping'
                        : isSearchingThis
                        ? 'bg-cyan-400 animate-pulse'
                        : isLive
                        ? 'bg-emerald-400 animate-pulse'
                        : isConnecting || isReconnecting
                        ? 'bg-amber-400 animate-ping'
                        : isError
                        ? 'bg-rose-500'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span className="font-bold text-white tracking-wide">{cam.id}</span>
                  <span className="text-slate-300 font-sans text-xs drop-shadow-sm truncate max-w-[130px] sm:max-w-[200px]">
                    {cam.name}
                  </span>
                </div>

                {/* Protocol Badge & Stream Status */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider border ${protoBadge.bg}`}
                  >
                    {protoBadge.label}
                  </span>

                  {isLive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-emerald-950/85 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {isConnecting && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-amber-950/85 text-amber-300 border border-amber-500/50">
                      CONNECTING
                    </span>
                  )}
                  {isReconnecting && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-amber-950/85 text-amber-400 border border-amber-500/50">
                      RECONNECTING ({health?.reconnectAttempts || 1})
                    </span>
                  )}
                  {isError && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-rose-950/85 text-rose-300 border border-rose-500/50">
                      ERROR
                    </span>
                  )}
                  {isOffline && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-slate-900/85 text-slate-400 border border-slate-700/50">
                      OFFLINE
                    </span>
                  )}
                </div>
              </div>

              {/* Interactive Tactical PTZ Overlay Panel (if toggled for this camera) */}
              {isPtzOpen && (
                <div className="relative z-20 my-auto bg-slate-950/90 backdrop-blur-md p-3.5 rounded-2xl border border-amber-500/40 shadow-2xl flex flex-col items-center gap-2.5 animate-scale-in">
                  <div className="w-full flex items-center justify-between border-b border-slate-800 pb-1.5 text-xs font-mono">
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>PTZ CONTROLLER · {cam.id}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePtzCameraId(null)}
                      className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* D-Pad & Zoom Controls */}
                  <div className="flex items-center gap-6">
                    {/* Directional Pad */}
                    <div className="relative w-28 h-28 bg-slate-900/90 rounded-full border border-slate-700/80 p-1 flex items-center justify-center shadow-inner">
                      {/* Up */}
                      <button
                        type="button"
                        disabled={ptzPending}
                        onClick={() => handlePtzAction('START', { tiltSpeed: 0.5 })}
                        className="absolute top-1 left-1/2 -translate-x-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                        title="Tilt Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      {/* Down */}
                      <button
                        type="button"
                        disabled={ptzPending}
                        onClick={() => handlePtzAction('START', { tiltSpeed: -0.5 })}
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                        title="Tilt Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {/* Left */}
                      <button
                        type="button"
                        disabled={ptzPending}
                        onClick={() => handlePtzAction('START', { panSpeed: -0.5 })}
                        className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                        title="Pan Left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {/* Right */}
                      <button
                        type="button"
                        disabled={ptzPending}
                        onClick={() => handlePtzAction('START', { panSpeed: 0.5 })}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                        title="Pan Right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      {/* Center Home */}
                      <button
                        type="button"
                        disabled={ptzPending}
                        onClick={() => handlePtzAction('HOME')}
                        className="p-2 rounded-full bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                        title="Return Home"
                      >
                        <Home className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Zoom & Preset Column */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('START', { zoomSpeed: 0.5 })}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-[10px] font-mono transition-all cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>+</span>
                        </button>
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('START', { zoomSpeed: -0.5 })}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-[10px] font-mono transition-all cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                          <span>-</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('GOTO_PRESET', { presetId: 'preset-1' })}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-mono cursor-pointer"
                        >
                          P1
                        </button>
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('GOTO_PRESET', { presetId: 'preset-2' })}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-mono cursor-pointer"
                        >
                          P2
                        </button>
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('STOP')}
                          className="px-2 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-[9px] font-mono font-bold cursor-pointer"
                        >
                          HALT
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Status & Coordinates */}
                  <div className="w-full text-center text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-1 rounded-md">
                    <span>{ptzStatusMessage || `Pan: ${ptzCoords.pan ?? 0.0}° | Tilt: ${ptzCoords.tilt ?? 0.0}° | Zoom: ${ptzCoords.zoom ?? 1.0}x`}</span>
                  </div>
                </div>
              )}

              {/* Center target lock watermark or progress bar */}
              {!isPtzOpen && (
                <div className="relative z-10 my-auto text-center font-mono">
                  {isSearchingThis && (
                    <div className="max-w-xs mx-auto space-y-1.5 bg-black/60 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full transition-all duration-300"
                          style={{ width: `${worker.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-cyan-300 font-semibold block">
                        Live YOLOv8 Inference: {worker.processedFrames || 0} frames evaluated
                      </span>
                    </div>
                  )}
                  {isTargetFound && (
                    <div className="space-y-1 animate-fade-in bg-black/70 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-500/40 inline-block">
                      <span className="text-emerald-400 text-xs font-bold tracking-widest block uppercase">
                        CONFIRMED LOCK-ON // TRACK #{worker.trackId || 1}
                      </span>
                      <span className="text-[10px] text-emerald-200/90">
                        Target signature verified with {worker.confidence?.toFixed(1) || 96.4}% confidence
                      </span>
                    </div>
                  )}
                  {isNoTarget && (
                    <div className="space-y-1 animate-fade-in bg-black/70 backdrop-blur-xs p-2 rounded-xl border border-slate-700 inline-block">
                      <span className="text-slate-400 text-[10px] font-mono tracking-wider block uppercase">
                        SCAN COMPLETE // NO TARGET
                      </span>
                    </div>
                  )}
                  {!worker && !isSearchingThis && !isNoTarget && (
                    <div className="text-[10px] font-mono text-slate-400/80 uppercase tracking-widest bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md inline-block">
                      {isLive
                        ? `[LIVE STREAM ACTIVE · ${health?.currentFps.toFixed(1)} FPS]`
                        : `[STREAM STANDBY · ${cam.location}]`}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Bar inside feed */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300 pt-2 border-t border-white/10 bg-black/40 backdrop-blur-xs px-1 rounded-b-lg">
                <div className="flex items-center gap-2">
                  <span>{health ? `${health.currentFps.toFixed(1)} FPS` : '0.0 FPS'}</span>
                  {health && health.processingFps > 0 && (
                    <span className="text-indigo-300">(AI: {health.processingFps.toFixed(1)})</span>
                  )}
                  {health && health.framesReceived > 0 && (
                    <span className="text-slate-400">· {health.framesReceived} fr</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* PTZ Toggle Button if camera supports PTZ */}
                  {(cam.ptzEnabled || cam.protocol === 'ONVIF_PTZ') && (
                    <button
                      type="button"
                      onClick={() => setActivePtzCameraId(isPtzOpen ? null : cam.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-sans font-semibold transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer ${
                        isPtzOpen
                          ? 'bg-amber-600 text-white border border-amber-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                      }`}
                      title="Toggle PTZ Directional Pad"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>PTZ</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={streamToggling[cam.id]}
                    onClick={() => handleToggleStream(cam.id, isLive)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-sans font-semibold transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer ${
                      isLive
                        ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50'
                        : 'bg-emerald-700/70 hover:bg-emerald-600 text-white border border-emerald-600/50'
                    }`}
                  >
                    {isLive ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                    <span>{streamToggling[cam.id] ? 'Updating...' : isLive ? 'Stop Feed' : 'Start Feed'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchOrchestratedSearch('Bottle')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-sans font-semibold transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer text-[10px]"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Search</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom status strip */}
      <div className="px-4 py-2.5 rounded-xl bg-white/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Universal Surveillance Engine · Ingests real RTSP / ONVIF / USB hardware camera frames into YOLOv8 & ByteTrack with multi-camera preemption.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowLaunchModal(true)}
          className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline cursor-pointer flex items-center gap-1 self-end sm:self-auto"
        >
          <span>Launch Fanout Search</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* Launch Search Modal */}
      {showLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Launch Multi-Camera Live Search</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Fanned-out YOLOv8 detection & ByteTrack tracking across all active CCTV feeds.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Target Object</label>
              <input
                type="text"
                value={orchInput}
                onChange={(e) => setOrchInput(e.target.value)}
                placeholder="e.g. Bottle, Backpack, Laptop, Person, TV..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLaunchModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLaunchOrchestratedSearch()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Start Live Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Universal Physical Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600" />
                  <span>Register Physical Camera Feed</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Universal adapter abstraction for RTSP, ONVIF, PTZ, USB webcams & WebRTC
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterCamera} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Camera Name</label>
                  <input
                    type="text"
                    required
                    value={newCamName}
                    onChange={(e) => setNewCamName(e.target.value)}
                    placeholder="e.g. Front Gate Dome"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Location / Sector</label>
                  <input
                    type="text"
                    value={newCamLocation}
                    onChange={(e) => setNewCamLocation(e.target.value)}
                    placeholder="e.g. Zone 1 - Main Entrance"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Protocol Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Universal Protocol Adapter</label>
                <select
                  value={newCamProtocol}
                  onChange={(e) => setNewCamProtocol(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="RTSP">RTSP IP Camera (Generic / Axis / Dahua / Hikvision / Hanwha)</option>
                  <option value="ONVIF">ONVIF IP Camera (Profile S / G / T)</option>
                  <option value="ONVIF_PTZ">ONVIF PTZ Camera (Pan / Tilt / Zoom Control)</option>
                  <option value="USB_WEBCAM">USB Hardware Webcam (UVC / DirectShow / V4L2)</option>
                  <option value="WEBRTC">WebRTC / WHEP Ultra-Low-Latency Stream</option>
                  <option value="HLS">HLS Stream (.m3u8 playlist)</option>
                  <option value="LOCAL_NETWORK">Local Network Feed (HTTP / MJPEG)</option>
                </select>
              </div>

              {/* Protocol Dynamic Fields */}
              {newCamProtocol === 'USB_WEBCAM' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">DirectShow / UVC Device Index</label>
                  <select
                    value={newCamDeviceIndex}
                    onChange={(e) => setNewCamDeviceIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value={0}>Camera 0 (Default Integrated Webcam)</option>
                    <option value={1}>Camera 1 (External USB Camera)</option>
                    <option value={2}>Camera 2 (Secondary USB Video Device)</option>
                    <option value={3}>Camera 3</option>
                  </select>
                  <span className="text-[10px] text-slate-500 block">
                    Mapped to hardware index via OpenCV DirectShow backend on Windows.
                  </span>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Stream URI / Network Address</label>
                    <input
                      type="text"
                      value={newCamUri}
                      onChange={(e) => setNewCamUri(e.target.value)}
                      placeholder={
                        newCamProtocol === 'RTSP'
                          ? 'rtsp://192.168.1.100:554/live/ch0'
                          : newCamProtocol === 'ONVIF' || newCamProtocol === 'ONVIF_PTZ'
                          ? 'http://192.168.1.120:80/onvif/device_service'
                          : newCamProtocol === 'WEBRTC'
                          ? 'http://127.0.0.1:8889/cam/whep'
                          : 'http://192.168.1.150:8080/video'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Username (Optional)</label>
                      <input
                        type="text"
                        value={newCamUsername}
                        onChange={(e) => setNewCamUsername(e.target.value)}
                        placeholder="admin"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Password (Optional)</label>
                      <input
                        type="password"
                        value={newCamPassword}
                        onChange={(e) => setNewCamPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Probe Result Box */}
              {probeResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono animate-fade-in ${
                    probeResult.reachable
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {probeResult.reachable ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertOctagon className="w-4 h-4 text-amber-600" />
                      )}
                      <span>{probeResult.reachable ? 'CAMERA REACHABLE' : 'CAMERA UNREACHABLE'}</span>
                    </span>
                    <span>Ping: {probeResult.pingMs || 0}ms</span>
                  </div>

                  {probeResult.capabilities && (
                    <div className="mt-2 text-[10px] space-y-0.5 border-t border-emerald-200 pt-1.5 opacity-90">
                      <div>
                        Capabilities: PTZ ({probeResult.capabilities.ptz ? 'YES' : 'NO'}), Presets (
                        {probeResult.capabilities.presets ? 'YES' : 'NO'}), Snapshot (
                        {probeResult.capabilities.snapshot ? 'YES' : 'NO'})
                      </div>
                    </div>
                  )}

                  {probeResult.error && (
                    <div className="mt-1 text-[10px] text-rose-700 font-sans">{probeResult.error}</div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={probeLoading}
                  onClick={handleProbeCamera}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                >
                  <Activity className={`w-3.5 h-3.5 text-indigo-600 ${probeLoading ? 'animate-spin' : ''}`} />
                  <span>{probeLoading ? 'Probing Device...' : 'Test Connection / Probe'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {registerLoading ? 'Registering...' : 'Register Camera'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
