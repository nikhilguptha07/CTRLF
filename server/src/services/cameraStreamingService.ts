import { Readable } from 'stream';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { decryptCredential } from '../utils/encryption';
import { cameraRepository } from '../repositories/cameraRepository';
import { cameraStreamStatusRepository } from '../repositories/cameraStreamStatusRepository';
import { socketManager } from '../websocket/socketManager';
import {
  CameraSourceType,
  StreamState,
  CameraStreamHealth,
} from '../types/camera';

export class CameraStreamingService {
  private aiServiceUrl: string;

  constructor() {
    this.aiServiceUrl = env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  private getInternalHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'X-Internal-Service-Key': env.INTERNAL_SERVICE_KEY,
      ...extra,
    };
  }

  /**
   * SSRF Protection: Validates candidate camera stream URIs.
   * Only allows safe protocols (rtsp, rtsps, http, https, and internal test file paths).
   */
  validateStreamUri(uri: string): { valid: boolean; reason?: string } {
    if (!uri || typeof uri !== 'string') {
      return { valid: false, reason: 'Stream URI cannot be empty' };
    }

    const trimmed = uri.trim();

    // Allow USB webcam device identifiers (e.g. device://0)
    if (trimmed.startsWith('device://') || /^\d+$/.test(trimmed)) {
      return { valid: true };
    }

    // Allow relative local test video paths (for file-based test cameras without protocol scheme)
    if (!trimmed.includes('://') && (trimmed.endsWith('.mp4') || trimmed.endsWith('.avi') || trimmed.startsWith('reference/'))) {
      return { valid: true };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { valid: false, reason: 'Invalid URI syntax' };
    }

    const allowedProtocols = ['rtsp:', 'rtsps:', 'http:', 'https:', 'device:', 'webrtc:'];
    if (!allowedProtocols.includes(parsed.protocol.toLowerCase())) {
      return {
        valid: false,
        reason: `Unsupported stream protocol: ${parsed.protocol}. Supported protocols: RTSP, HTTP/HLS, USB Device, WebRTC.`,
      };
    }

    // SSRF Check: Prohibit dangerous loopback or metadata IPs in production
    const hostname = parsed.hostname.toLowerCase();
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const isCloudMetadata = hostname === '169.254.169.254';

    if (isCloudMetadata) {
      return { valid: false, reason: 'Access to link-local metadata endpoints is strictly prohibited' };
    }

    if (isLocalhost && env.NODE_ENV === 'production') {
      return { valid: false, reason: 'Loopback stream addresses are not permitted in production environment' };
    }

    return { valid: true };
  }

  /**
   * Masks sensitive credentials in RTSP or HTTP URLs for safe logging and telemetry.
   */
  maskStreamUri(uri: string): string {
    if (!uri) return '';
    try {
      const parsed = new URL(uri);
      if (parsed.username || parsed.password) {
        parsed.username = '***';
        parsed.password = '***';
        return parsed.toString();
      }
      return uri;
    } catch {
      // Regex fallback for non-standard RTSP strings
      return uri.replace(/\/\/[^:@\s]+:[^@\s]+@/, '//***:***@');
    }
  }

  /**
   * Resolve plaintext stream URI by decrypting database record if necessary.
   */
  private resolveDecryptedUri(camera: {
    sourceType?: CameraSourceType;
    sourceUriEncrypted?: string;
    rtspUrlEncrypted?: string;
  }): string {
    const enc = camera.sourceUriEncrypted || camera.rtspUrlEncrypted || '';
    if (!enc) return '';

    try {
      return decryptCredential(enc);
    } catch {
      // If not encrypted (e.g. plaintext file path or test string), use as-is
      return enc;
    }
  }

  /**
   * Starts a camera stream in the Python AI Service.
   */
  async startCameraStream(cameraId: string): Promise<boolean> {
    const camera = await cameraRepository.findById(cameraId);
    if (!camera) {
      throw new Error(`Camera with ID '${cameraId}' not found`);
    }

    const decryptedUri = this.resolveDecryptedUri(camera);
    const maskedUri = this.maskStreamUri(decryptedUri);

    const validation = this.validateStreamUri(decryptedUri);
    if (!validation.valid) {
      logger.warn(`Rejected camera stream URI for ${cameraId}: ${validation.reason}`, { maskedUri });
      throw new Error(`Invalid stream URI: ${validation.reason}`);
    }

    logger.info(`Starting stream ingestion for camera ${cameraId}`, {
      sourceType: camera.sourceType,
      sourceUri: maskedUri,
    });

    // Notify frontend connecting state
    socketManager.emitCameraStreamStatus({
      cameraId,
      status: 'CONNECTING',
      currentFps: 0,
      framesReceived: 0,
      framesDropped: 0,
      reconnectAttempts: 0,
    });

    try {
      const response = await fetch(`${this.aiServiceUrl}/stream/start`, {
        method: 'POST',
        headers: this.getInternalHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          camera_id: cameraId,
          source_type: camera.sourceType || 'RTSP',
          source_uri: decryptedUri,
          buffer_size: 5,
        }),
      });

      const data = (await response.json()) as any;
      const success = data?.status === 'SUCCESS';

      // Record state in Oracle
      await cameraStreamStatusRepository.upsert({
        cameraId,
        status: 'CONNECTING',
        connectedAt: new Date(),
        lastFrameAt: null,
        lastError: null,
        currentFps: 0.0,
        framesReceived: 0,
        framesDropped: 0,
        reconnectAttempts: 0,
        updatedAt: new Date(),
      });

      return success;
    } catch (err: any) {
      const maskedErr = this.maskStreamUri(err?.message || String(err));
      logger.error(`Failed to start camera stream on AI service for ${cameraId}: ${maskedErr}`);

      await cameraStreamStatusRepository.upsert({
        cameraId,
        status: 'ERROR',
        connectedAt: null,
        lastFrameAt: null,
        lastError: maskedErr,
        currentFps: 0.0,
        framesReceived: 0,
        framesDropped: 0,
        reconnectAttempts: 0,
        updatedAt: new Date(),
      });

      socketManager.emitCameraStreamStatus({
        cameraId,
        status: 'ERROR',
        lastError: maskedErr,
        currentFps: 0,
        framesReceived: 0,
        framesDropped: 0,
        reconnectAttempts: 0,
      });

      return false;
    }
  }

  /**
   * Stops a camera stream in the Python AI Service.
   */
  async stopCameraStream(cameraId: string): Promise<boolean> {
    try {
      await fetch(`${this.aiServiceUrl}/stream/stop`, {
        method: 'POST',
        headers: this.getInternalHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ camera_id: cameraId }),
      });
    } catch (err) {
      logger.warn(`AI service call to stop stream ${cameraId} encountered warning:`, { error: String(err) });
    }

    await cameraStreamStatusRepository.upsert({
      cameraId,
      status: 'STOPPED',
      connectedAt: null,
      lastFrameAt: null,
      lastError: null,
      currentFps: 0.0,
      framesReceived: 0,
      framesDropped: 0,
      reconnectAttempts: 0,
      updatedAt: new Date(),
    });

    socketManager.emitCameraStreamStatus({
      cameraId,
      status: 'STOPPED',
      currentFps: 0,
      framesReceived: 0,
      framesDropped: 0,
      reconnectAttempts: 0,
    });

    return true;
  }

  /**
   * Get real-time stream health telemetry from Python AI service.
   */
  async getCameraHealth(cameraId: string): Promise<CameraStreamHealth> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/stream/${encodeURIComponent(cameraId)}/health`, {
        headers: this.getInternalHeaders(),
      });
      if (!response.ok) {
        throw new Error(`AI service stream health responded with HTTP ${response.status}`);
      }

      const data = (await response.json()) as any;
      const health: CameraStreamHealth = {
        cameraId: data.camera_id || data.cameraId || cameraId,
        status: (data.status as StreamState) || 'DISCONNECTED',
        connectedAt: data.connected_at || data.connectedAt,
        lastFrameAt: data.last_frame_at || data.lastFrameAt,
        currentFps: Number(data.current_fps || data.currentFps) || 0.0,
        processingFps: Number(data.processing_fps || data.processingFps) || 0.0,
        framesReceived: Number(data.frames_received || data.framesReceived) || 0,
        framesDropped: Number(data.frames_dropped || data.framesDropped) || 0,
        reconnectAttempts: Number(data.reconnect_attempts || data.reconnectAttempts) || 0,
        lastError: data.last_error || data.lastError ? this.maskStreamUri(data.last_error || data.lastError) : null,
      };

      // Sync latest health to Oracle persistence
      await cameraStreamStatusRepository.upsert({
        cameraId: health.cameraId,
        status: health.status,
        connectedAt: health.connectedAt ? new Date(health.connectedAt) : null,
        lastFrameAt: health.lastFrameAt ? new Date(health.lastFrameAt) : null,
        lastError: health.lastError,
        currentFps: health.currentFps,
        framesReceived: health.framesReceived,
        framesDropped: health.framesDropped,
        reconnectAttempts: health.reconnectAttempts,
        updatedAt: new Date(),
      });

      return health;
    } catch (err: any) {
      // Return cached database record if AI service is temporarily offline
      const cached = await cameraStreamStatusRepository.findByCameraId(cameraId);
      if (cached) {
        return {
          cameraId: cached.cameraId,
          status: cached.status,
          connectedAt: cached.connectedAt?.toISOString(),
          lastFrameAt: cached.lastFrameAt?.toISOString(),
          currentFps: cached.currentFps,
          processingFps: 0.0,
          framesReceived: cached.framesReceived,
          framesDropped: cached.framesDropped,
          reconnectAttempts: cached.reconnectAttempts,
          lastError: cached.lastError,
        };
      }

      return {
        cameraId,
        status: 'DISCONNECTED',
        currentFps: 0.0,
        processingFps: 0.0,
        framesReceived: 0,
        framesDropped: 0,
        reconnectAttempts: 0,
        lastError: 'Camera stream offline or unreachable',
      };
    }
  }

  /**
   * Fetch current decoded JPEG snapshot bytes from camera stream.
   */
  async getCameraSnapshot(cameraId: string): Promise<Buffer | null> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/stream/${encodeURIComponent(cameraId)}/snapshot`, {
        headers: this.getInternalHeaders(),
      });
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  /**
   * Returns incoming readable stream for MJPEG multipart/x-mixed-replace preview.
   */
  async getCameraPreviewStream(cameraId: string): Promise<{
    contentType: string;
    stream: Readable;
  }> {
    const response = await fetch(`${this.aiServiceUrl}/stream/${encodeURIComponent(cameraId)}/preview`, {
      headers: this.getInternalHeaders(),
    });
    if (!response.ok || !response.body) {
      throw new Error(`AI service preview responded with HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=frame';
    const stream = Readable.fromWeb(response.body as any);
    return { contentType, stream };
  }

  /**
   * Start asynchronous YOLO + ByteTrack live search worker on an active camera stream in AI service.
   */
  async startLiveSearch(params: {
    cameraId: string;
    sessionId: string;
    targetClass: string;
    confidenceThreshold?: number;
    minConfirmationFrames?: number;
    detectionFps?: number;
    timeoutSeconds?: number;
  }): Promise<{ status: string; message?: string }> {
    const response = await fetch(
      `${this.aiServiceUrl}/stream/${encodeURIComponent(params.cameraId)}/search/start`,
      {
        method: 'POST',
        headers: this.getInternalHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          camera_id: params.cameraId,
          session_id: params.sessionId,
          target_query: params.targetClass,
          target_class: params.targetClass,
          sample_fps: params.detectionFps ?? 5.0,
          detection_fps: params.detectionFps ?? 5.0,
          confidence_threshold: params.confidenceThreshold ?? 0.45,
          min_confirmation_frames: params.minConfirmationFrames ?? 3,
          timeout_seconds: params.timeoutSeconds ?? 30.0,
        }),
      }
    );

    return (await response.json()) as any;
  }

  /**
   * Query status of a live search worker on a camera stream.
   */
  async getLiveSearchStatus(cameraId: string, sessionId: string): Promise<{
    sessionId: string;
    cameraId: string;
    status: string;
    targetFound: boolean;
    confidence: number;
    bbox: number[] | null;
    trackId: number | null;
    framesProcessed: number;
    elapsedSeconds: number;
    evidencePath: string | null;
    errorMessage: string | null;
  }> {
    const response = await fetch(
      `${this.aiServiceUrl}/stream/${encodeURIComponent(cameraId)}/search/${encodeURIComponent(sessionId)}/status`,
      {
        headers: this.getInternalHeaders(),
      }
    );
    const d = (await response.json()) as any;
    return {
      sessionId: d.sessionId || d.session_id,
      cameraId: d.cameraId || d.camera_id,
      status: d.status,
      targetFound: Boolean(d.targetFound !== undefined ? d.targetFound : d.target_found),
      confidence: Number(d.confidence ?? d.bestDetection?.confidence) || 0,
      bbox: d.bbox || (d.bestDetection?.bbox ? [d.bestDetection.bbox.x1, d.bestDetection.bbox.y1, d.bestDetection.bbox.x2, d.bestDetection.bbox.y2] : null),
      trackId: d.trackId != null ? Number(d.trackId) : (d.matchedTrackId != null ? Number(d.matchedTrackId) : (d.track_id != null ? Number(d.track_id) : null)),
      framesProcessed: Number(d.processedFrames ?? d.frames_processed) || 0,
      elapsedSeconds: Number(d.elapsedSeconds ?? d.elapsed_seconds) || 0,
      evidencePath: d.annotatedEvidence || d.evidencePath || d.evidence_path || (d.evidenceFrames && d.evidenceFrames[0]) || null,
      errorMessage: d.errorMessage || d.error_message || null,
    };
  }

  /**
   * Stop an active live search worker on a camera stream.
   */
  async stopLiveSearch(cameraId: string, sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.aiServiceUrl}/stream/${encodeURIComponent(cameraId)}/search/stop`,
        {
          method: 'POST',
          headers: this.getInternalHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ camera_id: cameraId, session_id: sessionId }),
        }
      );
      const data = (await response.json()) as any;
      return data?.status === 'STOPPED';
    } catch {
      return false;
    }
  }
}

export const cameraStreamingService = new CameraStreamingService();
