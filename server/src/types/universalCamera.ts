/**
 * UNIVERSAL CAMERA ARCHITECTURE FOR CTRL-F
 * Vendor-agnostic camera abstraction supporting physical CCTV, ONVIF, RTSP, PTZ, USB, Local Network, WebRTC, and HLS.
 */

export type CameraProtocol =
  | 'RTSP'
  | 'ONVIF'
  | 'ONVIF_PTZ'
  | 'USB_WEBCAM'
  | 'LOCAL_NETWORK'
  | 'WEBRTC'
  | 'HLS'
  | 'CUSTOM';

export interface CameraCapabilities {
  ptz: boolean;
  pan: boolean;
  tilt: boolean;
  zoom: boolean;
  presets: boolean;
  snapshot: boolean;
  twoWayAudio: boolean;
  webrtc: boolean;
  hls: boolean;
}

export type PTZAction = 'START' | 'STOP' | 'GOTO_PRESET' | 'SET_PRESET' | 'HOME';

export interface PTZCommand {
  action: PTZAction;
  panSpeed?: number;   // -1.0 (left) to 1.0 (right)
  tiltSpeed?: number;  // -1.0 (down) to 1.0 (up)
  zoomSpeed?: number;  // -1.0 (wide) to 1.0 (tele)
  presetId?: string;
  presetName?: string;
  durationMs?: number; // auto-stop after duration
}

export interface PTZResult {
  success: boolean;
  action: PTZAction;
  message?: string;
  pan?: number;
  tilt?: number;
  zoom?: number;
}

export interface CameraConnectionConfig {
  protocol: CameraProtocol;
  uri?: string;                    // RTSP, HTTP, HLS, or WebRTC signaling URL
  host?: string;                   // IP / Hostname for ONVIF or network cameras
  port?: number;                   // 554 for RTSP, 80/8080 for ONVIF
  path?: string;                   // Stream path e.g. /live/ch0
  deviceIndex?: number;            // 0, 1, 2 for USB / UVC webcams
  username?: string;
  password?: string;
  onvifProfileToken?: string;
  transport?: 'tcp' | 'udp' | 'http';
  width?: number;
  height?: number;
  fps?: number;
  customHeaders?: Record<string, string>;
}

export interface CameraConnectionResult {
  connected: boolean;
  protocol: CameraProtocol;
  streamUri: string;
  effectiveFps: number;
  resolution?: { width: number; height: number };
  capabilities: CameraCapabilities;
  deviceInfo?: {
    manufacturer?: string;
    model?: string;
    firmwareVersion?: string;
    serialNumber?: string;
  };
  error?: string;
}

export interface ICameraAdapter {
  readonly protocol: CameraProtocol;
  connect(config: CameraConnectionConfig): Promise<CameraConnectionResult>;
  disconnect(): Promise<void>;
  getStreamUri(): Promise<string>;
  getSnapshot(): Promise<Buffer | null>;
  sendPtzCommand?(command: PTZCommand): Promise<PTZResult>;
  getCapabilities(): CameraCapabilities;
  probeHealth(): Promise<{ isAlive: boolean; latencyMs: number; error?: string }>;
}
