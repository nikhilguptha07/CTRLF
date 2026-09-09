import { CameraProtocol, CameraCapabilities } from './universalCamera';

export * from './universalCamera';

export type CameraSourceType =
  | 'FILE'
  | 'RTSP'
  | 'HTTP_STREAM'
  | 'ONVIF'
  | 'ONVIF_PTZ'
  | 'USB_WEBCAM'
  | 'LOCAL_NETWORK'
  | 'WEBRTC'
  | 'HLS'
  | 'CUSTOM';

export type StreamState =
  | 'STOPPED'
  | 'CONNECTING'
  | 'LIVE'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'ACTIVE_SEARCH' | 'ERROR';

export interface Camera {
  id: string;
  userId: string;
  name: string;
  location: string;
  protocol?: CameraProtocol;
  sourceType?: CameraSourceType;
  sourceUriEncrypted?: string;
  rtspUrlEncrypted?: string; // backward-compatibility alias
  enabled?: boolean;
  priority?: number;
  calibrationId?: string | null;
  status: CameraStatus;
  streamStatus?: StreamState;
  capabilities?: CameraCapabilities;
  ptzEnabled?: boolean;
  deviceIndex?: number | null;
  lastConnectedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CameraResponse {
  id: string;
  name: string;
  location: string;
  protocol?: CameraProtocol;
  sourceType?: CameraSourceType;
  enabled?: boolean;
  priority?: number;
  calibrationId?: string | null;
  status: CameraStatus;
  streamStatus?: StreamState;
  capabilities?: CameraCapabilities;
  ptzEnabled?: boolean;
  deviceIndex?: number | null;
  lastConnectedAt?: Date | null;
  currentFps?: number;
  framesReceived?: number;
  framesDropped?: number;
  lastFrameAt?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CameraStreamHealth {
  cameraId: string;
  status: StreamState;
  connectedAt?: string | null;
  lastFrameAt?: string | null;
  currentFps: number;
  processingFps: number;
  framesReceived: number;
  framesDropped: number;
  reconnectAttempts: number;
  lastError?: string | null;
}

export interface CameraStreamStatusRecord {
  cameraId: string;
  status: StreamState;
  connectedAt?: Date | null;
  lastFrameAt?: Date | null;
  lastError?: string | null;
  currentFps: number;
  framesReceived: number;
  framesDropped: number;
  reconnectAttempts: number;
  updatedAt: Date;
}

export type SearchJobStatus =
  | 'QUEUED'
  | 'PROCESSING_LIVE'
  | 'TARGET_ACQUIRED'
  | 'NOT_DETECTED'
  | 'CANCELLED'
  | 'FAILED';

export interface SearchJobRecord {
  id: string;
  sessionId: string;
  cameraId: string;
  jobStatus: SearchJobStatus;
  startedAt: Date;
  endedAt?: Date | null;
  framesProcessed: number;
  lastFrameAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
}
