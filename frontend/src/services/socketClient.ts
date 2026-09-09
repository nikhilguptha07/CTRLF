import { io, Socket } from 'socket.io-client';
import type { CameraWorkerStatus } from './apiClient';

export interface OrchestratorSocketCallbacks {
  onInit?: (data: { sessionId: string; target: string; cameras: Record<string, CameraWorkerStatus> }) => void;
  onCameraProgress?: (data: {
    cameraId: string;
    cameraName: string;
    progressPercent: number;
    processedFrames?: number;
    totalFrames?: number;
    currentTimestamp?: number;
  }) => void;
  onTargetFound?: (data: {
    cameraId: string;
    cameraName: string;
    confidence: number;
    trackId?: number;
    detection?: any;
    evidencePath?: string | null;
  }) => void;
  onCameraCancelled?: (data: { cameraId: string; reason: string }) => void;
  onCameraNoTarget?: (data: { cameraId: string; cameraName: string }) => void;
  onComplete?: (data: {
    status: string;
    target: string;
    winningCameraId: string | null;
    winningCameraName: string | null;
    detection: any;
    message: string;
  }) => void;
}

class SocketClient {
  private socket: Socket | null = null;
  private currentSearchId: string | null = null;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketUrl = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:5000';
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[SocketClient] Connected to surveillance WebSocket gateway');
      if (this.currentSearchId) {
        this.joinSearch(this.currentSearchId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketClient] Disconnected from surveillance gateway:', reason);
    });

    return this.socket;
  }

  joinSearch(searchId: string, callbacks?: OrchestratorSocketCallbacks) {
    this.currentSearchId = searchId;
    const socket = this.connect();

    socket.emit('subscribe:search', searchId);

    if (callbacks) {
      // Clean previous listeners to prevent double triggers
      socket.off('orchestrator:init');
      socket.off('orchestrator:camera_progress');
      socket.off('orchestrator:target_found');
      socket.off('orchestrator:camera_cancelled');
      socket.off('orchestrator:camera_no_target');
      socket.off('orchestrator:complete');

      if (callbacks.onInit) socket.on('orchestrator:init', callbacks.onInit);
      if (callbacks.onCameraProgress) socket.on('orchestrator:camera_progress', callbacks.onCameraProgress);
      if (callbacks.onTargetFound) socket.on('orchestrator:target_found', callbacks.onTargetFound);
      if (callbacks.onCameraCancelled) socket.on('orchestrator:camera_cancelled', callbacks.onCameraCancelled);
      if (callbacks.onCameraNoTarget) socket.on('orchestrator:camera_no_target', callbacks.onCameraNoTarget);
      if (callbacks.onComplete) socket.on('orchestrator:complete', callbacks.onComplete);
    }
  }

  leaveSearch(searchId?: string) {
    const id = searchId || this.currentSearchId;
    if (this.socket && id) {
      this.socket.emit('unsubscribe:search', id);
    }
    this.currentSearchId = null;
  }

  onStreamStatus(callback: (status: import('./apiClient').CameraStreamHealth) => void) {
    const socket = this.connect();
    socket.on('stream:status', callback);
    socket.on('stream.status', callback);
  }

  offStreamStatus(callback: (status: import('./apiClient').CameraStreamHealth) => void) {
    if (this.socket) {
      this.socket.off('stream:status', callback);
      this.socket.off('stream.status', callback);
    }
  }
}

export const socketClient = new SocketClient();
