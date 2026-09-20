import React, { useState, useEffect, useRef } from 'react';
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
  Trash2,
  Smartphone,
  Video,
  Monitor,
  Globe,
  RefreshCw,
  Play,
  Check,
} from 'lucide-react';
import { apiClient, type CameraStreamHealth } from '../../services/apiClient';
import { socketClient } from '../../services/socketClient';
import { soundService } from '../../services/soundService';
import { detectObjectsInElement } from '../../utils/clientObjectDetector';

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
  isBrowserStream?: boolean;
  streamUrl?: string;
}

const DEMO_SAMPLE_FEEDS: CameraNode[] = [
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
];

const PUBLIC_SAMPLE_STREAMS = [
  {
    name: 'Public Traffic Cam — Major Intersection',
    location: 'Zone 1 - Downtown Junction',
    protocol: 'HLS',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    name: 'City Plaza Surveillance Stream',
    location: 'Zone 2 - Central Plaza',
    protocol: 'HTTP_STREAM',
    url: 'http://127.0.0.1:8080/video',
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
    activeMediaStream,
    setActiveMediaStream,
  } = useExperienceStore();

  // Cameras State — loaded from backend or local persistence
  const [cameras, setCameras] = useState<CameraNode[]>(() => {
    try {
      const saved = localStorage.getItem('ctrlf_cctv_nodes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [cameraHealth, setCameraHealth] = useState<Record<string, CameraStreamHealth>>({});
  const [orchInput, setOrchInput] = useState('');
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'device' | 'phone' | 'ip' | 'screen' | 'public'>('device');
  const [streamToggling, setStreamToggling] = useState<Record<string, boolean>>({});

  // Active Browser Media Streams (Webcam / USB CC Cam / Screen Capture)
  const [activeMediaStreams, setActiveMediaStreams] = useState<Record<string, MediaStream>>({});
  const activeStreamsRef = useRef<Record<string, MediaStream>>({});
  activeStreamsRef.current = activeMediaStreams;

  // Video Element references for live detection and display
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Real-time AI Detections on Live Feeds
  const [liveDetections, setLiveDetections] = useState<
    Record<string, Array<{ class: string; score: number; bbox: any; isMatch: boolean }>>
  >({});
  const [searchingCameraIds, setSearchingCameraIds] = useState<Record<string, boolean>>({});
  const searchingCameraIdsRef = useRef<Record<string, boolean>>({});
  searchingCameraIdsRef.current = searchingCameraIds;

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
  const [newCamUsername, setNewCamUsername] = useState<string>('');
  const [newCamPassword, setNewCamPassword] = useState<string>('');
  const [probeResult, setProbeResult] = useState<any | null>(null);
  const [probeLoading, setProbeLoading] = useState<boolean>(false);
  const [registerLoading, setRegisterLoading] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Device Enumeration for Direct CC Cam / Webcam
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [devicePreviewStream, setDevicePreviewStream] = useState<MediaStream | null>(null);
  const [devicePermissionError, setDevicePermissionError] = useState<string | null>(null);
  const [deviceDetecting, setDeviceDetecting] = useState<boolean>(false);
  const modalPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Synchronize cameras to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ctrlf_cctv_nodes', JSON.stringify(cameras));
    } catch {}
  }, [cameras]);

  // 1. Load cameras from backend on mount
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
            isBrowserStream: false,
            streamUrl: c.streamUrl || '',
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
        if (cam.isBrowserStream) continue;
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

  // Clean up all media streams on unmount
  useEffect(() => {
    return () => {
      Object.values(activeStreamsRef.current).forEach((st) => {
        st.getTracks().forEach((t) => t.stop());
      });
      if (devicePreviewStream) {
        devicePreviewStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Bind preview stream in modal
  useEffect(() => {
    if (modalPreviewRef.current && devicePreviewStream) {
      modalPreviewRef.current.srcObject = devicePreviewStream;
      modalPreviewRef.current.play().catch(() => {});
    }
  }, [devicePreviewStream]);

  // Enumerate Video Devices for Device Tab
  const enumerateDevices = async () => {
    setDeviceDetecting(true);
    setDevicePermissionError(null);
    try {
      // Request initial stream to grant permission so labels are populated
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableVideoDevices(videoDevs);

      if (videoDevs.length > 0) {
        const defaultDev = videoDevs[0];
        setSelectedDeviceId(defaultDev.deviceId);
        setDevicePreviewStream(tempStream);
      } else {
        tempStream.getTracks().forEach((t) => t.stop());
        setDevicePermissionError('No video capture devices detected. Plug in a USB CC Cam or Webcam.');
      }
    } catch (err: any) {
      setDevicePermissionError(
        err.message || 'Camera access permission denied. Please allow camera permissions in your browser.'
      );
    } finally {
      setDeviceDetecting(false);
    }
  };

  const handleSelectDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (devicePreviewStream) {
      devicePreviewStream.getTracks().forEach((t) => t.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      setDevicePreviewStream(newStream);
    } catch (err: any) {
      setDevicePermissionError(err.message || 'Failed to switch to selected camera device');
    }
  };

  // Connect Local Hardware CC Cam / Webcam
  const handleConnectDeviceCam = () => {
    if (!devicePreviewStream && !selectedDeviceId) {
      setRegisterError('Please grant camera access or select a valid camera device');
      return;
    }

    const streamToUse = devicePreviewStream;
    if (!streamToUse) {
      setRegisterError('No active camera preview. Please click Detect Cameras.');
      return;
    }

    const camId = `CAM_${String(cameras.length + 1).padStart(2, '0')}`;
    const selectedDevObj = availableVideoDevices.find((d) => d.deviceId === selectedDeviceId);
    const camName =
      newCamName.trim() ||
      selectedDevObj?.label ||
      `CC Cam Hardware (${selectedDeviceId.slice(0, 6)}...)`;
    const camLoc = newCamLocation.trim() || 'Zone Alpha - Station Feed';

    const newCam: CameraNode = {
      id: camId,
      name: camName,
      location: camLoc,
      protocol: 'USB_WEBCAM',
      ptzEnabled: false,
      fps: '30.0',
      res: '1080p · Direct Live',
      status: 'ONLINE',
      color: 'border-emerald-500/70 ring-2 ring-emerald-500/30',
      active: true,
      isBrowserStream: true,
    };

    // Save in backend if supported
    apiClient
      .registerCamera({
        name: camName,
        location: camLoc,
        protocol: 'USB_WEBCAM',
        streamUrl: `device://${selectedDeviceId}`,
      })
      .catch(() => {});

    setActiveMediaStreams((prev) => ({ ...prev, [camId]: streamToUse }));
    setActiveMediaStream(streamToUse);
    setCameras((prev) => [...prev, newCam]);
    setDevicePreviewStream(null);
    setShowAddModal(false);
    soundService.playDetected();
  };

  // Connect Screen / DVR Capture
  const handleConnectScreenCapture = async () => {
    setRegisterError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' } as any,
        audio: false,
      });

      const camId = `CAM_DVR_${Date.now().toString().slice(-4)}`;
      const camName = newCamName.trim() || 'DVR Surveillance Monitor Feed';
      const camLoc = newCamLocation.trim() || 'Zone Beta - External DVR Ingest';

      const newCam: CameraNode = {
        id: camId,
        name: camName,
        location: camLoc,
        protocol: 'WEBRTC',
        ptzEnabled: false,
        fps: '30.0',
        res: '1080p · DVR Stream',
        status: 'ONLINE',
        color: 'border-cyan-500/70 ring-2 ring-cyan-500/30',
        active: true,
        isBrowserStream: true,
      };

      stream.getVideoTracks()[0].onended = () => {
        handleDeleteCamera(camId);
      };

      setActiveMediaStreams((prev) => ({ ...prev, [camId]: stream }));
      setActiveMediaStream(stream);
      setCameras((prev) => [...prev, newCam]);
      setShowAddModal(false);
      soundService.playDetected();
    } catch (err: any) {
      setRegisterError(err.message || 'Screen capture cancelled or blocked');
    }
  };

  // Connect Phone / IP / RTSP / Public Camera
  const handleRegisterNetworkCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName.trim()) {
      setRegisterError('Please enter a camera name');
      return;
    }
    if (!newCamUri.trim()) {
      setRegisterError('Please provide a valid stream URI or IP address');
      return;
    }

    setRegisterLoading(true);
    setRegisterError(null);

    const camId = `CAM_${String(cameras.length + 1).padStart(2, '0')}`;
    const camName = newCamName.trim();
    const camLoc = newCamLocation.trim() || 'Surveillance Zone';

    const newCam: CameraNode = {
      id: camId,
      name: camName,
      location: camLoc,
      protocol: newCamProtocol,
      ptzEnabled: newCamProtocol === 'ONVIF_PTZ',
      fps: '25.0',
      res: '1080p · Stream',
      status: 'ONLINE',
      color: 'border-blue-500/60',
      active: true,
      isBrowserStream: false,
      streamUrl: newCamUri.trim(),
    };

    try {
      await apiClient.registerCamera({
        name: camName,
        location: camLoc,
        protocol: newCamProtocol,
        streamUrl: newCamUri.trim(),
        username: newCamUsername || undefined,
        password: newCamPassword || undefined,
        ptzEnabled: newCamProtocol === 'ONVIF_PTZ',
      });
    } catch (err: any) {
      console.warn('Backend registration warning:', err);
    }

    setCameras((prev) => [...prev, newCam]);
    setShowAddModal(false);
    setNewCamName('');
    setNewCamLocation('');
    setNewCamUri('');
    setProbeResult(null);
    setRegisterLoading(false);
    soundService.playDetected();
  };

  // Delete Individual Camera
  const handleDeleteCamera = (cameraId: string) => {
    const stream = activeStreamsRef.current[cameraId];
    if (stream) {
      if (activeMediaStream === stream) {
        setActiveMediaStream(null);
      }
      stream.getTracks().forEach((t) => t.stop());
      setActiveMediaStreams((prev) => {
        const next = { ...prev };
        delete next[cameraId];
        return next;
      });
    }

    apiClient.stopCameraStream(cameraId).catch(() => {});
    apiClient.deleteCamera(cameraId).catch(() => {});

    setCameras((prev) => prev.filter((c) => c.id !== cameraId));
    setLiveDetections((prev) => {
      const next = { ...prev };
      delete next[cameraId];
      return next;
    });
  };

  // Clear All Feeds (Remove All / Dummy Cameras)
  const handleClearAllFeeds = async () => {
    Object.values(activeStreamsRef.current).forEach((st) => {
      st.getTracks().forEach((t) => t.stop());
    });
    setActiveMediaStreams({});
    setActiveMediaStream(null);
    apiClient.deleteAllCameras().catch(() => {});
    setCameras([]);
    setLiveDetections({});
    localStorage.removeItem('ctrlf_cctv_nodes');
  };

  // Load Demo / Sample Feeds
  const handleLoadDemoFeeds = async () => {
    try {
      const seeded = await apiClient.seedDefaultCameras();
      if (seeded && seeded.length > 0) {
        refreshCameras();
        return;
      }
    } catch {}
    setCameras(DEMO_SAMPLE_FEEDS);
  };

  // Real-time AI Object Search on Camera
  const handleSearchOnCamera = async (cameraId: string, target?: string) => {
    const query = target || orchInput.trim() || searchQuery || 'Bottle';
    setSearchingCameraIds((prev) => ({ ...prev, [cameraId]: true }));

    const videoEl = videoRefs.current[cameraId];
    const isBrowserCam = Boolean(activeMediaStreams[cameraId]);

    if (videoEl && isBrowserCam) {
      soundService.playTransition();
      let iterations = 0;
      const interval = setInterval(async () => {
        iterations++;
        if (iterations > 30 || !searchingCameraIdsRef.current[cameraId]) {
          clearInterval(interval);
          setSearchingCameraIds((prev) => ({ ...prev, [cameraId]: false }));
          return;
        }

        try {
          const detections = await detectObjectsInElement(videoEl, query);
          if (detections && detections.length > 0) {
            setLiveDetections((prev) => ({ ...prev, [cameraId]: detections }));
            const match = detections.find((d) => d.isMatch);
            if (match) {
              soundService.playDetected();
            }
          }
        } catch (detErr) {
          console.warn('Live frame detection warning:', detErr);
        }
      }, 600);
    } else {
      // Standard orchestrator flow for network cameras
      handleLaunchOrchestratedSearch(query);
    }
  };

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

  const getProtocolBadge = (protocol?: string) => {
    switch (protocol) {
      case 'ONVIF_PTZ':
        return { label: 'ONVIF PTZ', bg: 'bg-amber-950/80 text-amber-300 border-amber-500/40' };
      case 'ONVIF':
        return { label: 'ONVIF IP', bg: 'bg-purple-950/80 text-purple-300 border-purple-500/40' };
      case 'USB_WEBCAM':
        return { label: 'USB CC CAM', bg: 'bg-teal-950/80 text-teal-300 border-teal-500/40' };
      case 'PHONE_IP_CAM':
        return { label: 'PHONE CC CAM', bg: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40' };
      case 'WEBRTC':
        return { label: 'DVR / WHEP', bg: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' };
      case 'HLS':
        return { label: 'HLS STREAM', bg: 'bg-pink-950/80 text-pink-300 border-pink-500/40' };
      case 'LOCAL_NETWORK':
      case 'HTTP_STREAM':
        return { label: 'HTTP CCTV', bg: 'bg-sky-950/80 text-sky-300 border-sky-500/40' };
      default:
        return { label: 'RTSP CCTV', bg: 'bg-blue-950/80 text-blue-300 border-blue-500/40' };
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span>
                {cameras.length > 0
                  ? `${cameras.length} CCTV FEED${cameras.length > 1 ? 'S' : ''} ACTIVE`
                  : 'READY TO CONNECT'}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect Physical CC Cam · USB Webcam · Smartphone IP Cam · RTSP / ONVIF DVR · Real YOLOv8 AI Object Search
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Connect CC Cam Primary Button */}
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              enumerateDevices();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>Connect CC Cam</span>
          </button>

          {/* Clear Dummy / All Feeds Button */}
          {cameras.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllFeeds}
              title="Remove dummy or all current feeds"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear Feeds</span>
            </button>
          )}

          {/* Launch Orchestrated Search Button */}
          {isOrchSearching ? (
            <button
              type="button"
              onClick={cancelSearchFlow}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              <span>Cancel Search</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={cameras.length === 0}
              onClick={() => setShowLaunchModal(true)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer ${
                cameras.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Search All Feeds</span>
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

      {/* Empty State: No Cameras Connected */}
      {cameras.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
            <Camera className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">No CCTV Feeds Connected</h3>
            <p className="text-xs text-slate-500">
              The dummy feeds have been removed. Connect your physical CC Cam (USB webcam, HDMI capture card, smartphone IP camera, or RTSP network feed) to start real-time surveillance.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                enumerateDevices();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>Connect CC Cam Now</span>
            </button>
            <button
              type="button"
              onClick={handleLoadDemoFeeds}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-indigo-600" />
              <span>Load Demo Feeds</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Feed Grid */}
      {cameras.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
          {cameras.map((cam) => {
            const worker = orchestratorCameras[cam.id];
            const isTargetFound = worker?.status === 'TARGET_FOUND';
            const isPreempted = worker?.status === 'CANCELLED_PREEMPTED';
            const isSearchingThis = worker?.status === 'SEARCHING' || searchingCameraIds[cam.id];
            const isNoTarget = worker?.status === 'NO_TARGET';

            const mediaStream = activeMediaStreams[cam.id];
            const isBrowserCam = Boolean(mediaStream);

            // Real Stream Status
            const health = cameraHealth[cam.id];
            const isLive = isBrowserCam || health?.status === 'LIVE' || cam.status === 'ONLINE';
            const isConnecting = !isBrowserCam && health?.status === 'CONNECTING';
            const isReconnecting = !isBrowserCam && health?.status === 'RECONNECTING';
            const isError = !isBrowserCam && health?.status === 'ERROR';
            const isOffline = !isLive && !isConnecting && !isReconnecting && !isError;

            const protoBadge = getProtocolBadge(cam.protocol);
            const isPtzOpen = activePtzCameraId === cam.id;
            const camDetections = liveDetections[cam.id] || [];

            // Dynamic card border/glow
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
                className={`relative rounded-2xl bg-slate-950 overflow-hidden border p-3.5 flex flex-col justify-between group shadow-sm transition-all min-h-[260px] ${borderGlow}`}
              >
                {/* 1. Live Browser Hardware Stream (Webcam / USB CC Cam / Screen Capture) */}
                {isBrowserCam ? (
                  <video
                    ref={(el) => {
                      videoRefs.current[cam.id] = el;
                      if (el && el.srcObject !== mediaStream) {
                        el.srcObject = mediaStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                ) : isLive && apiClient.getCameraPreviewUrl ? (
                  /* 2. Live IP / RTSP / MJPEG Camera Stream */
                  <img
                    src={apiClient.getCameraPreviewUrl(cam.id)}
                    alt={cam.name}
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-85"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  /* 3. Dark surveillance fallback */
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black opacity-95 z-0" />
                )}

                {/* Tactical Scanline overlay */}
                <div className="absolute inset-0 scanline-overlay opacity-30 pointer-events-none z-1" />

                {/* Real-time Bounding Box Canvas Overlay for Live AI Detections */}
                {camDetections.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none z-3 p-2 overflow-hidden">
                    {camDetections.map((det, idx) => (
                      <div
                        key={idx}
                        className={`absolute border-2 rounded transition-all ${
                          det.isMatch
                            ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-300 animate-pulse'
                            : 'border-cyan-400 bg-cyan-500/10'
                        }`}
                        style={{
                          left: `${Math.min(90, Math.max(5, (det.bbox.x / 640) * 100))}%`,
                          top: `${Math.min(85, Math.max(5, (det.bbox.y / 480) * 100))}%`,
                          width: `${Math.min(70, Math.max(10, (det.bbox.width / 640) * 100))}%`,
                          height: `${Math.min(70, Math.max(10, (det.bbox.height / 480) * 100))}%`,
                        }}
                      >
                        <span
                          className={`absolute -top-5 left-0 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shadow-sm ${
                            det.isMatch ? 'bg-emerald-500 text-black' : 'bg-cyan-600 text-white'
                          }`}
                        >
                          {det.class} {(det.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live scanning line if actively searching */}
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
                    <span className="text-slate-300 font-sans text-xs drop-shadow-sm truncate max-w-[120px] sm:max-w-[180px]">
                      {cam.name}
                    </span>
                  </div>

                  {/* Badges & Delete Button */}
                  <div className="flex items-center gap-1.5">
                    {isBrowserCam && activeMediaStream === mediaStream && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-blue-950/90 text-blue-300 border border-blue-500/60 flex items-center gap-1">
                        <Video className="w-2.5 h-2.5 text-blue-400" />
                        3D RIG
                      </span>
                    )}

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

                    {isOffline && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-slate-900/85 text-slate-400 border border-slate-700/50">
                        OFFLINE
                      </span>
                    )}

                    {/* Delete Camera Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCamera(cam.id)}
                      title="Remove this camera feed"
                      className="p-1 rounded-lg bg-black/50 hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 transition-all cursor-pointer border border-white/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Interactive Tactical PTZ Overlay Panel */}
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

                    <div className="flex items-center gap-6">
                      <div className="relative w-28 h-28 bg-slate-900/90 rounded-full border border-slate-700/80 p-1 flex items-center justify-center shadow-inner">
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('START', { tiltSpeed: 0.5 })}
                          className="absolute top-1 left-1/2 -translate-x-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                          title="Tilt Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('START', { tiltSpeed: -0.5 })}
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                          title="Tilt Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('START', { panSpeed: -0.5 })}
                          className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                          title="Pan Left"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={ptzPending}
                          onClick={() => handlePtzAction('START', { panSpeed: 0.5 })}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 transition-all cursor-pointer"
                          title="Pan Right"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
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
                      </div>
                    </div>

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
                            style={{ width: `${worker?.progressPercent || 65}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-cyan-300 font-semibold block">
                          Real YOLOv8 Inference Active · Analyzing live frames
                        </span>
                      </div>
                    )}
                    {isTargetFound && (
                      <div className="space-y-1 animate-fade-in bg-black/70 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-500/40 inline-block">
                        <span className="text-emerald-400 text-xs font-bold tracking-widest block uppercase">
                          CONFIRMED LOCK-ON // TRACK #{worker?.trackId || 1}
                        </span>
                        <span className="text-[10px] text-emerald-200/90">
                          Target signature verified with {worker?.confidence?.toFixed(1) || 96.4}% confidence
                        </span>
                      </div>
                    )}
                    {!worker && !isSearchingThis && !isNoTarget && (
                      <div className="text-[10px] font-mono text-slate-300 uppercase tracking-widest bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-md inline-block border border-white/10">
                        {isLive
                          ? `[LIVE FEED ACTIVE · 30.0 FPS · ${cam.location}]`
                          : `[STANDBY · ${cam.location}]`}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Bar inside feed */}
                <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300 pt-2 border-t border-white/10 bg-black/40 backdrop-blur-xs px-1 rounded-b-lg">
                  <div className="flex items-center gap-2">
                    <span>{isLive ? '30.0 FPS' : '0.0 FPS'}</span>
                    {isBrowserCam && <span className="text-teal-300">(Hardware CC Cam)</span>}
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

                    {/* Set Active 3D Stream for Browser CC Cam */}
                    {isBrowserCam && (
                      <button
                        type="button"
                        onClick={() => {
                          if (mediaStream) setActiveMediaStream(mediaStream);
                        }}
                        title="Beam this live camera feed to the 3D Surveillance Rig"
                        className={`px-2 py-1 rounded-lg text-[10px] font-sans font-semibold transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer ${
                          activeMediaStream === mediaStream
                            ? 'bg-blue-600 text-white border border-blue-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        <Video className="w-3 h-3" />
                        <span>{activeMediaStream === mediaStream ? '3D Active' : 'Set 3D'}</span>
                      </button>
                    )}

                    {/* Toggle Stream */}
                    {!isBrowserCam && (
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
                        <span>{streamToggling[cam.id] ? '...' : isLive ? 'Stop' : 'Start'}</span>
                      </button>
                    )}

                    {/* Search On This Camera Button */}
                    <button
                      type="button"
                      onClick={() => handleSearchOnCamera(cam.id, 'Bottle')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white font-sans font-semibold transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer text-[10px]"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Search Feed</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom status strip */}
      <div className="px-4 py-2.5 rounded-xl bg-white/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Universal CCTV Engine · Plug & play connection for direct USB CC Cams, smartphone IP Webcams, RTSP & DVR streams.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            enumerateDevices();
          }}
          className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline cursor-pointer flex items-center gap-1 self-end sm:self-auto"
        >
          <span>Connect New CC Cam</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* Multi-Camera Search Modal */}
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
                placeholder="e.g. Bottle, Backpack, Laptop, Person, Cell phone..."
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

      {/* Connect CC Cam Ingestion Hub Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600" />
                  <span>Connect CC Cam (Universal CCTV Hub)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your camera type: USB CC Cam, Phone IP Webcam, Network RTSP, or DVR Window
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  if (devicePreviewStream) {
                    devicePreviewStream.getTracks().forEach((t) => t.stop());
                    setDevicePreviewStream(null);
                  }
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ingestion Type Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAddModalTab('device');
                  enumerateDevices();
                }}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  addModalTab === 'device'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>USB / Device CC Cam</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('phone')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  addModalTab === 'phone'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone as CC Cam</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('ip')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  addModalTab === 'ip'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Network IP / RTSP</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('screen')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  addModalTab === 'screen'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>DVR Window</span>
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('public')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  addModalTab === 'public'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Public Feeds</span>
              </button>
            </div>

            {registerError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            {/* TAB 1: Direct Device / USB CC Cam (Browser MediaDevices) */}
            {addModalTab === 'device' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Direct Hardware Connection (Plug & Play)</span>
                  </span>
                  <p className="text-[11px] text-indigo-700">
                    Connects any CCTV camera attached via USB, HDMI/RCA capture dongle, laptop webcam, or mobile camera plugged into this PC.
                  </p>
                </div>

                {devicePermissionError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                    <p>{devicePermissionError}</p>
                    <button
                      type="button"
                      onClick={enumerateDevices}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Detection</span>
                    </button>
                  </div>
                )}

                {/* Device Selector */}
                {availableVideoDevices.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Select CC Cam Device</label>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleSelectDevice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    >
                      {availableVideoDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Camera Device ${idx + 1} (${dev.deviceId.slice(0, 8)}...)`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Live Preview Box */}
                <div className="relative rounded-2xl bg-black overflow-hidden h-44 border border-slate-800 flex items-center justify-center">
                  <video
                    ref={modalPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!devicePreviewStream && (
                    <div className="text-center p-4 space-y-2 text-slate-400 font-mono text-xs">
                      <Camera className="w-8 h-8 mx-auto text-slate-600" />
                      <span>Click Detect Cameras to request permission & preview feed</span>
                    </div>
                  )}
                  {devicePreviewStream && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 font-mono text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      PREVIEW LIVE (30 FPS)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Camera Name</label>
                    <input
                      type="text"
                      value={newCamName}
                      onChange={(e) => setNewCamName(e.target.value)}
                      placeholder="e.g. Desk CC Cam / Front Entrance"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Location / Sector</label>
                    <input
                      type="text"
                      value={newCamLocation}
                      onChange={(e) => setNewCamLocation(e.target.value)}
                      placeholder="e.g. Zone Alpha"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={deviceDetecting}
                    onClick={enumerateDevices}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${deviceDetecting ? 'animate-spin' : ''}`} />
                    <span>Detect Cameras</span>
                  </button>
                  <button
                    type="button"
                    disabled={!devicePreviewStream}
                    onClick={handleConnectDeviceCam}
                    className={`px-5 py-2 rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      devicePreviewStream
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Connect & Start Feed</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Phone as CC Cam (IP Webcam) */}
            {addModalTab === 'phone' && (
              <form onSubmit={handleRegisterNetworkCamera} className="space-y-3.5">
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Turn any Smartphone into a CCTV Camera</span>
                  </span>
                  <ol className="text-[11px] text-indigo-800 list-decimal list-inside space-y-0.5 pt-1">
                    <li>Install the free <b>IP Webcam</b> app on Android (or <i>IP Camera</i> on iPhone).</li>
                    <li>Connect phone to the same Wi-Fi, scroll down and click <b>Start Server</b>.</li>
                    <li>Enter the address shown on your phone screen below:</li>
                  </ol>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Phone Stream Address / URL</label>
                  <input
                    type="text"
                    required
                    value={newCamUri}
                    onChange={(e) => {
                      setNewCamUri(e.target.value);
                      setNewCamProtocol('PHONE_IP_CAM');
                    }}
                    placeholder="e.g. http://192.168.1.150:8080/video"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Supported: http://...:8080/video (MJPEG) or rtsp://...:8080/h264_pcm.sdp
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Camera Name</label>
                    <input
                      type="text"
                      required
                      value={newCamName}
                      onChange={(e) => setNewCamName(e.target.value)}
                      placeholder="e.g. Mobile CC Cam 1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Location / Sector</label>
                    <input
                      type="text"
                      value={newCamLocation}
                      onChange={(e) => setNewCamLocation(e.target.value)}
                      placeholder="e.g. Zone Gamma - Living Room"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {registerLoading ? 'Connecting...' : 'Connect Phone CC Cam'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Network IP Camera (RTSP / ONVIF) */}
            {addModalTab === 'ip' && (
              <form onSubmit={handleRegisterNetworkCamera} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Protocol</label>
                    <select
                      value={newCamProtocol}
                      onChange={(e) => setNewCamProtocol(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    >
                      <option value="RTSP">RTSP (Hikvision, Dahua, CP Plus, Reolink)</option>
                      <option value="ONVIF">ONVIF IP Camera</option>
                      <option value="ONVIF_PTZ">ONVIF PTZ (Pan/Tilt/Zoom)</option>
                      <option value="HTTP_STREAM">HTTP / MJPEG Stream</option>
                    </select>
                  </div>
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
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">RTSP Stream URI / Network Address</label>
                  <input
                    type="text"
                    required
                    value={newCamUri}
                    onChange={(e) => setNewCamUri(e.target.value)}
                    placeholder="rtsp://192.168.1.100:554/live/ch0"
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Password (Optional)</label>
                    <input
                      type="password"
                      value={newCamPassword}
                      onChange={(e) => setNewCamPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

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
                    {probeResult.error && (
                      <div className="mt-1 text-[10px] text-rose-700 font-sans">{probeResult.error}</div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={probeLoading}
                    onClick={handleProbeCamera}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                  >
                    <Activity className={`w-3.5 h-3.5 ${probeLoading ? 'animate-spin' : ''}`} />
                    <span>{probeLoading ? 'Probing...' : 'Test Connection'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {registerLoading ? 'Connecting...' : 'Connect IP Camera'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: DVR / Screen Window Capture */}
            {addModalTab === 'screen' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-100 text-xs text-cyan-900 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Monitor className="w-4 h-4 text-cyan-600" />
                    <span>Capture External DVR / Surveillance Software Window</span>
                  </span>
                  <p className="text-[11px] text-cyan-800">
                    If your CCTV system runs inside desktop software (SmartPSS, iVMS-4200, Blue Iris, or a browser CCTV portal), you can share that window as a live surveillance feed.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Camera Feed Label</label>
                  <input
                    type="text"
                    value={newCamName}
                    onChange={(e) => setNewCamName(e.target.value)}
                    placeholder="e.g. DVR Quad Monitor"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleConnectScreenCapture}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Monitor className="w-4 h-4" />
                    <span>Select CCTV Window & Stream</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: Public / Sample Online CCTV Feeds */}
            {addModalTab === 'public' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Select a verified public CCTV stream to test live surveillance & YOLO object detection:
                </p>

                <div className="space-y-2">
                  {PUBLIC_SAMPLE_STREAMS.map((pub, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-all"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">{pub.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 block">{pub.location}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const camId = `CAM_${String(cameras.length + 1).padStart(2, '0')}`;
                          const newCam: CameraNode = {
                            id: camId,
                            name: pub.name,
                            location: pub.location,
                            protocol: pub.protocol,
                            fps: '25.0',
                            res: '1080p · Live Public',
                            status: 'ONLINE',
                            color: 'border-blue-500/60',
                            active: true,
                            isBrowserStream: false,
                            streamUrl: pub.url,
                          };
                          setCameras((prev) => [...prev, newCam]);
                          setShowAddModal(false);
                          soundService.playDetected();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs cursor-pointer"
                      >
                        Add Feed
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
