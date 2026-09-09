import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SearchStage } from '../types/search';
import { DetectionResult } from '../types/detection';

export interface ProgressPayload {
  searchId: string;
  progress: number;
  stage: SearchStage;
  message: string;
  processedFrames?: number;
  totalFrames?: number;
  progressPercent?: number;
  elapsedTime?: number;
  estimatedRemainingTime?: number | null;
  currentFrame?: number;
  currentTimestamp?: number;
}

export class SocketManager {
  private io: Server | null = null;

  init(server: HttpServer): Server {
    this.io = new Server(server, {
      cors: {
        origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });

      // Join search room for targeted updates
      socket.on('subscribe:search', (searchId: string) => {
        socket.join(`search:${searchId}`);
        logger.info(`Socket subscribed to search room: search:${searchId}`, { socketId: socket.id, searchId });
      });

      socket.on('unsubscribe:search', (searchId: string) => {
        socket.leave(`search:${searchId}`);
        logger.info(`Socket left search room: search:${searchId}`, { socketId: socket.id, searchId });
      });

      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
      });
    });

    logger.info('Socket.IO WebSocket server initialized');
    return this.io;
  }

  emitSearchQueued(searchId: string, payload: any) {
    this.io?.to(`search:${searchId}`).emit('search:queued', payload);
    this.io?.to(`search:${searchId}`).emit('search.queued', payload);
    this.io?.emit('search:status', {
      type: 'QUEUED',
      searchId,
      ...payload,
    });
  }

  emitSearchTracking(searchId: string, tracks: import('../types/tracking').TrackingResult[]) {
    this.io?.to(`search:${searchId}`).emit('search:tracking', tracks);
    this.io?.to(`search:${searchId}`).emit('track.updated', tracks);
    this.io?.to(`search:${searchId}`).emit('search:status', {
      type: 'TRACKING_UPDATED',
      searchId,
      tracks,
    });
  }

  emitSearchStarted(searchId: string, initialPayload: ProgressPayload) {
    this.io?.to(`search:${searchId}`).emit('search:started', initialPayload);
    this.io?.to(`search:${searchId}`).emit('search.started', initialPayload);
    this.io?.emit('search:status', {
      type: 'SEARCHING',
      ...initialPayload,
    });
  }

  emitSearchProgress(payload: ProgressPayload) {
    const progressPercent = payload.progressPercent ?? payload.progress;
    const enriched = {
      ...payload,
      progressPercent,
    };
    this.io?.to(`search:${payload.searchId}`).emit('search:progress', enriched);
    this.io?.to(`search:${payload.searchId}`).emit('search.progress', enriched);
    this.io?.to(`search:${payload.searchId}`).emit('search:status', {
      type: 'SCAN_PROGRESS',
      ...enriched,
    });
  }

  emitSearchDetection(searchId: string, result: DetectionResult) {
    this.io?.to(`search:${searchId}`).emit('search:detection', result);
    this.io?.to(`search:${searchId}`).emit('detection.created', result);
    this.io?.to(`search:${searchId}`).emit('search:status', {
      type: 'DETECTION_UPDATED',
      searchId,
      detection: result,
    });
  }

  emitEvidenceCreated(searchId: string, evidence: any) {
    this.io?.to(`search:${searchId}`).emit('evidence:created', evidence);
    this.io?.to(`search:${searchId}`).emit('evidence.created', evidence);
    this.io?.to(`search:${searchId}`).emit('search:status', {
      type: 'EVIDENCE_CREATED',
      searchId,
      evidence,
    });
  }

  emitSearchCancelled(searchId: string, message = 'Search operation cancelled by user') {
    const payload = {
      searchId,
      stage: 'CANCELLED',
      progress: 100,
      message,
    };
    this.io?.to(`search:${searchId}`).emit('search:cancelled', payload);
    this.io?.to(`search:${searchId}`).emit('search.cancelled', payload);
    this.io?.to(`search:${searchId}`).emit('search:status', {
      type: 'CANCELLED',
      sessionId: searchId,
      searchId,
      message,
    });
  }

  emitSearchComplete(searchId: string, finalPayload: ProgressPayload, result?: DetectionResult | null) {
    const isDetected = finalPayload.stage === 'DETECTED';
    this.io?.to(`search:${searchId}`).emit('search:complete', {
      ...finalPayload,
      result: result || null,
    });
    this.io?.to(`search:${searchId}`).emit('search.completed', {
      ...finalPayload,
      result: result || null,
    });
    this.io?.to(`search:${searchId}`).emit('search:status', {
      ...finalPayload,
      type: isDetected ? 'TARGET_DETECTED' : 'NOT_DETECTED',
      sessionId: searchId,
      target: result?.detectedLabel || 'UNKNOWN',
      confidence: result ? result.confidence / 100 : 0,
      position: result?.boundingBox || null,
      completedAt: new Date().toISOString(),
    });
  }

  emitScanStarted(searchId: string) {
    this.io?.to(`search:${searchId}`).emit('scan:started', { searchId, timestamp: Date.now() });
    this.io?.to(`search:${searchId}`).emit('scan.started', { searchId, timestamp: Date.now() });
    this.io?.emit('search:status', { type: 'SCAN_STARTED', searchId });
  }

  emitFrameProcessed(searchId: string, frameIndex: number, totalFrames: number, timestampMs: number) {
    this.io?.to(`search:${searchId}`).emit('frame:processed', {
      searchId,
      frameIndex,
      totalFrames,
      timestampMs,
    });
    this.io?.to(`search:${searchId}`).emit('frame.processed', {
      searchId,
      frameIndex,
      totalFrames,
      timestampMs,
    });
  }

  emitTargetAcquired(searchId: string, candidate: any) {
    this.io?.to(`search:${searchId}`).emit('target:acquired', {
      searchId,
      candidate,
      timestamp: Date.now(),
    });
    this.io?.to(`search:${searchId}`).emit('target.acquired', {
      searchId,
      candidate,
      timestamp: Date.now(),
    });
    this.io?.emit('search:status', {
      type: 'TARGET_ACQUIRED',
      searchId,
      candidate,
    });
  }

  emitSearchError(searchId: string, errorMessage: string) {
    this.io?.to(`search:${searchId}`).emit('search:error', {
      searchId,
      error: errorMessage,
      stage: 'FAILED',
    });
    this.io?.to(`search:${searchId}`).emit('search.failed', {
      searchId,
      error: errorMessage,
      stage: 'FAILED',
    });
    this.io?.to(`search:${searchId}`).emit('search:status', {
      type: 'ERROR',
      sessionId: searchId,
      searchId,
      error: errorMessage,
    });
  }

  // --- Multi-Camera Orchestrator Events ---

  emitOrchestratorInit(searchId: string, payload: { target: string; cameras: any[] }) {
    this.io?.to(`search:${searchId}`).emit('orchestrator:init', payload);
    this.io?.emit('orchestrator:status', {
      type: 'ORCHESTRATOR_INIT',
      searchId,
      ...payload,
    });
  }

  emitCameraProgress(searchId: string, payload: {
    cameraId: string;
    cameraName: string;
    progressPercent: number;
    processedFrames: number;
    totalFrames: number;
    currentTimestamp?: number;
  }) {
    this.io?.to(`search:${searchId}`).emit('orchestrator:camera_progress', {
      searchId,
      ...payload,
    });
    this.io?.emit('orchestrator:status', {
      type: 'CAMERA_PROGRESS',
      searchId,
      ...payload,
    });
  }

  emitCameraTargetFound(searchId: string, payload: {
    cameraId: string;
    cameraName: string;
    confidence: number;
    trackId?: number | null;
    detection: any;
    evidencePath?: string | null;
    visualization?: any;
  }) {
    this.io?.to(`search:${searchId}`).emit('orchestrator:target_found', {
      searchId,
      ...payload,
    });
    this.io?.emit('orchestrator:status', {
      type: 'CAMERA_TARGET_FOUND',
      searchId,
      ...payload,
    });

    // Phase 7 Real-time Event Specification (Section 36)
    const rawConf = payload.confidence <= 1 ? payload.confidence : parseFloat((payload.confidence / 100).toFixed(4));
    const targetAcquiredEvent = {
      event: 'target.acquired',
      sessionId: searchId,
      cameraId: payload.cameraId,
      trackId: payload.trackId ?? null,
      className: payload.detection?.label || payload.detection?.className || 'target',
      confidence: rawConf,
      bbox: payload.detection?.boundingBox ? {
        x1: payload.detection.boundingBox.x,
        y1: payload.detection.boundingBox.y,
        x2: payload.detection.boundingBox.x + payload.detection.boundingBox.width,
        y2: payload.detection.boundingBox.y + payload.detection.boundingBox.height,
      } : payload.detection?.bbox,
      imagePoint: payload.visualization?.imagePoint || (payload.detection?.boundingBox ? {
        x: Math.round(payload.detection.boundingBox.x + payload.detection.boundingBox.width / 2),
        y: Math.round(payload.detection.boundingBox.y + payload.detection.boundingBox.height / 2),
      } : undefined),
      normalizedPoint: payload.visualization?.normalizedPoint,
      ray: payload.visualization?.ray,
      desiredAngles: payload.visualization?.desiredAngles,
      localizationMode: payload.visualization?.localizationMode || 'RAY_ONLY',
      evidencePath: payload.evidencePath,
    };

    this.io?.to(`search:${searchId}`).emit('target.acquired', targetAcquiredEvent);
    this.io?.emit('target.acquired', targetAcquiredEvent);
  }

  emitTargetLost(searchId: string, payload: {
    cameraId: string;
    trackId?: number | null;
    reason?: string;
  }) {
    const lostPayload = {
      event: 'target.lost',
      sessionId: searchId,
      cameraId: payload.cameraId,
      trackId: payload.trackId ?? null,
      reason: payload.reason || 'TRACK_BUFFER_EXCEEDED',
      timestamp: new Date().toISOString(),
    };
    this.io?.to(`search:${searchId}`).emit('target.lost', lostPayload);
    this.io?.emit('target.lost', lostPayload);
  }

  emitCameraCancelled(searchId: string, payload: {
    cameraId: string;
    cameraName: string;
    reason: string;
    winningCameraId?: string;
  }) {
    this.io?.to(`search:${searchId}`).emit('orchestrator:camera_cancelled', {
      searchId,
      ...payload,
    });
    this.io?.emit('orchestrator:status', {
      type: 'CAMERA_CANCELLED',
      searchId,
      ...payload,
    });
  }

  emitCameraNoTarget(searchId: string, payload: {
    cameraId: string;
    cameraName: string;
  }) {
    this.io?.to(`search:${searchId}`).emit('orchestrator:camera_no_target', {
      searchId,
      ...payload,
    });
  }

  emitOrchestratorComplete(searchId: string, payload: {
    status: SearchStage;
    target: string;
    winningCameraId?: string | null;
    winningCameraName?: string | null;
    detection?: any | null;
    message: string;
  }) {
    this.io?.to(`search:${searchId}`).emit('orchestrator:complete', {
      searchId,
      ...payload,
    });
    this.io?.emit('orchestrator:status', {
      type: 'ORCHESTRATOR_COMPLETE',
      searchId,
      ...payload,
    });
  }

  // --- Phase 8 Camera Stream Events ---

  emitCameraStreamStatus(payload: {
    cameraId: string;
    status: import('../types/camera').StreamState;
    currentFps: number;
    framesReceived: number;
    framesDropped: number;
    reconnectAttempts: number;
    lastError?: string | null;
    connectedAt?: string | null;
    lastFrameAt?: string | null;
  }) {
    const statusPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    this.io?.to(`camera:${payload.cameraId}`).emit('stream:status', statusPayload);
    this.io?.emit('stream:status', statusPayload);
    this.io?.emit('stream.status', statusPayload);

    // Specific granular stream events per Phase 8 spec section 11
    switch (payload.status) {
      case 'CONNECTING':
        this.io?.emit('stream.connecting', statusPayload);
        break;
      case 'LIVE':
        this.io?.emit('stream.live', statusPayload);
        break;
      case 'RECONNECTING':
        this.io?.emit('stream.reconnecting', statusPayload);
        break;
      case 'DISCONNECTED':
        this.io?.emit('stream.disconnected', statusPayload);
        break;
      case 'ERROR':
        this.io?.emit('stream.error', statusPayload);
        break;
    }
  }
}

export const socketManager = new SocketManager();
