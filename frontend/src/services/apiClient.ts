/**
 * CONTROL F — Centralized Frontend API Client
 * Single Source of Truth for Backend Search & Tracking Integration
 */

export interface StartSearchResponse {
  sessionId: string;
  searchId: string;
  status: 'SEARCHING' | 'QUEUED' | 'DETECTED' | 'NOT_DETECTED' | 'FAILED';
  target: string;
}

export interface CameraWorkerStatus {
  cameraId: string;
  cameraName: string;
  location?: string;
  status: 'IDLE' | 'CONNECTING' | 'SEARCHING' | 'TARGET_FOUND' | 'NO_TARGET' | 'CANCELLED_PREEMPTED' | 'ERROR';
  progressPercent: number;
  processedFrames?: number;
  totalFrames?: number;
  confidence?: number;
  trackId?: number;
  evidencePath?: string | null;
  cancelReason?: string;
}

export interface OrchestratorStatusResponse {
  sessionId: string;
  target: string;
  status: string;
  winningCameraId: string | null;
  cameras: Record<string, CameraWorkerStatus>;
  allDone: boolean;
}

export interface CameraStreamHealth {
  cameraId: string;
  status: 'STOPPED' | 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';
  connectedAt?: string | null;
  lastFrameAt?: string | null;
  currentFps: number;
  processingFps: number;
  framesReceived: number;
  framesDropped: number;
  reconnectAttempts: number;
  lastError?: string | null;
}

export interface SearchTelemetrySession {
  id: string;
  userId: string;
  objectName: string;
  status: string;
  progressPercent: number;
  errorMessage?: string | null;
  trackId?: number | null;
  matchedTrackId?: number | null;
  targetRecord?: {
    targetText?: string;
    targetClass?: string | null;
    targetColor?: string | null;
    normalizedTarget?: string;
  } | null;
  tracks?: Array<{
    id?: string;
    trackId: number;
    className: string;
    confidence: number;
    frameIndex?: number;
    timestampMs?: number;
    status?: string;
    dominantColor?: string;
    secondaryColors?: string[];
  }>;
  evidence?: Array<{
    id?: string;
    evidenceId?: string;
    trackId?: number | null;
    frameNumber?: number;
    timestampMs?: number;
    confidence?: number;
    originalImagePath?: string;
    annotatedImagePath?: string;
  }>;
  detection?: {
    id: string;
    found: boolean;
    confidence: number;
    detectedLabel: string;
    dominantColor?: string | null;
    colorConfidence?: number | null;
    secondaryColors?: string[] | null;
    frameTimestampMs?: number | null;
    lastSeenTimestampMs?: number | null;
    lastSeenFrame?: number | null;
    trackId?: number | null;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
  } | null;
  lastTargetObservation?: {
    confidence: number;
    frameIndex?: number;
    timestampMs?: number;
    dominantColor?: string | null;
    colorConfidence?: number | null;
    boundingBox?: any;
    trackId?: number | string | null;
  } | null;
  result?: {
    lastSeenTimestamp?: string | number | null;
    lastSeenFrame?: number | null;
    lastSeenBbox?: string | null;
    lastSeenConfidence?: number | null;
    lastSeenColor?: string | null;
    lastSeenEvidencePath?: string | null;
    summaryNotes?: string | null;
  } | null;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  permissions: string[];
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface AuditVerificationResult {
  verified: boolean;
  totalBlocks: number;
  chainValid: boolean;
  headHash: string | null;
  genesisHash: string | null;
  compromisedBlock: number | null;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) {
      this.baseUrl = envUrl;
    } else if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
      this.baseUrl = 'https://ctrlf-1.onrender.com';
    } else {
      this.baseUrl = 'http://localhost:5000';
    }
  }

  setToken(token: string | null) {
    this.accessToken = token;
  }

  getToken(): string | null {
    return this.accessToken;
  }

  getEvidenceFrameUrl(
    sessionId: string,
    options?: { type?: 'annotated' | 'original'; evidenceId?: string; frameNumber?: number }
  ): string {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.evidenceId) params.set('evidenceId', options.evidenceId);
    if (options?.frameNumber != null) params.set('frame', String(options.frameNumber));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return `${this.baseUrl}/api/search/${encodeURIComponent(sessionId)}/evidence/frame${qs}`;
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include', // Sends HttpOnly access/refresh token cookies securely
    });
  }

  /**
   * Real Authentication endpoints (Section 1 - Oracle 21c XE Backed)
   */
  async login(
    credentialsOrEmail: string | { email?: string; username?: string; identifier?: string; password: string; rememberMe?: boolean },
    passwordInput?: string
  ): Promise<AuthResponse> {
    let body: any;
    if (typeof credentialsOrEmail === 'string') {
      body = { email: credentialsOrEmail, password: passwordInput };
    } else {
      body = credentialsOrEmail;
    }
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || errData?.message || 'Authentication failed');
    }
    const json = await res.json();
    if (json.data?.accessToken) {
      this.accessToken = json.data.accessToken;
      localStorage.setItem('ctrlf_token', json.data.accessToken);
    }
    return json.data;
  }

  async register(userData: { username?: string; email: string; password: string; fullName: string; role?: string }): Promise<AuthResponse> {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || errData?.message || 'Registration failed');
    }
    const json = await res.json();
    if (json.data?.accessToken) {
      this.accessToken = json.data.accessToken;
      localStorage.setItem('ctrlf_token', json.data.accessToken);
    }
    return json.data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.accessToken = null;
      localStorage.removeItem('ctrlf_token');
      localStorage.removeItem('ctrlf_user');
    }
  }

  async getMe(): Promise<UserProfile | null> {
    try {
      const res = await this.request('/api/auth/me');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  }

  /**
   * Tamper-Evident Audit Chain Verification (Section 14)
   */
  async verifyAuditLogs(): Promise<AuditVerificationResult> {
    const res = await this.request('/api/audit-logs/verify');
    if (!res.ok) {
      throw new Error(`Audit verification query failed (${res.status})`);
    }
    const json = await res.json();
    return json.data;
  }

  async clearDatabase(): Promise<{ message: string; recordsRemoved: number; clearedTables: string[] }> {
    const res = await this.request('/api/admin/clear-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || json.message || 'Failed to clear database');
    }
    return json.data;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getEvidenceUrl(evidenceId: string): string {
    return `${this.baseUrl}/api/evidence/${encodeURIComponent(evidenceId)}`;
  }

  /**
   * Start a new backend search session
   * Calls POST /api/search with authoritative payload
   */
  async startSearch(
    target: string | { className?: string | null; color?: string | null },
    sourceType: 'CAMERA' | 'VIDEO' = 'CAMERA',
    sourceId = '1',
    extraPayload: Record<string, any> = {}
  ): Promise<StartSearchResponse> {
    const targetPayload =
      typeof target === 'string'
        ? { target, objectName: target }
        : { target, objectName: target.className || 'object' };

    const res = await this.request('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...targetPayload,
        sourceType,
        sourceId,
        videoId: sourceType === 'VIDEO' ? sourceId : undefined,
        ...extraPayload,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Backend search initiation failed (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Start an Orchestrated Multi-Camera search session
   * Automatically fans out search across all connected surveillance nodes
   */
  async startOrchestratedSearch(
    target: string,
    cameraIds?: string[]
  ): Promise<StartSearchResponse & { orchestrator: boolean; cameraCount: number }> {
    const res = await fetch(`${this.baseUrl}/api/search/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target,
        objectName: target,
        sourceType: 'ORCHESTRATOR',
        cameraIds,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Orchestrated search initiation failed (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch real-time Orchestrator status for all cameras
   */
  async getOrchestratorStatus(sessionId: string): Promise<OrchestratorStatusResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/search/${sessionId}/orchestrator`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  }


  /**
   * Fetch current session status and detection result
   * Calls GET /api/search/:searchId
   */
  async getSearchSession(sessionId: string): Promise<SearchTelemetrySession> {
    const res = await fetch(`${this.baseUrl}/api/search/${sessionId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch session ${sessionId}`);
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Poll search progress until final status is reached
   */
  async pollUntilComplete(
    sessionId: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<SearchTelemetrySession> {
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const session = await this.getSearchSession(sessionId);
        if (onProgress) {
          onProgress(session.progressPercent, session.status);
        }

        if (['DETECTED', 'NOT_DETECTED', 'FAILED', 'CANCELLED'].includes(session.status)) {
          return session;
        }
      } catch (err) {
        console.warn(`[ApiClient] Poll error on attempt ${attempts}:`, err);
      }

      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    throw new Error('Search session timed out waiting for AI verification');
  }


  /**
   * Fetch historical search sessions stored in database
   * Calls GET /api/history
   */
  async getSearchHistory(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/history`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch audit logs stored in database
   * Calls GET /api/history/audit
   */
  async getAuditLogs(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/history/audit`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Cancel an in-progress search session
   * Calls POST /api/search/:searchId/cancel
   */
  async cancelSearch(sessionId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/search/${sessionId}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to cancel search session');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch real-time progress details
   * Calls GET /api/search/:searchId/progress
   */
  async getSearchProgress(sessionId: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/search/${sessionId}/progress`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  }

  /**
   * Fetch evidence records for search
   * Calls GET /api/search/:searchId/evidence
   */
  async getSearchEvidence(sessionId: string): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/search/${sessionId}/evidence`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch all ByteTrack tracks for search session
   * Calls GET /api/search/:searchId/tracks
   */
  async getSearchTracks(sessionId: string): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/search/${sessionId}/tracks`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Upload video footage file for search analysis
   * Calls POST /api/videos/upload
   */
  async uploadVideo(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('video', file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/videos/upload`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error?.message || `Footage upload failed (${res.status})`);
      }

      const json = await res.json();
      return json.data;
    } catch (networkErr: any) {
      if (networkErr.message?.includes('Failed to fetch')) {
        throw new Error(`Unable to reach backend server at ${this.baseUrl}. Please verify the backend service is running.`);
      }
      throw networkErr;
    }
  }

  /**
   * Fetch all registered surveillance cameras
   * Calls GET /api/cameras
   */
  async getCameras(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/cameras`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch real-time camera stream health telemetry
   * Calls GET /api/cameras/:cameraId/health
   */
  async getCameraHealth(cameraId: string): Promise<CameraStreamHealth | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/cameras/${encodeURIComponent(cameraId)}/health`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  }

  getCameraSnapshotUrl(cameraId: string): string {
    return `${this.baseUrl}/api/cameras/${encodeURIComponent(cameraId)}/snapshot`;
  }

  getCameraPreviewUrl(cameraId: string): string {
    return `${this.baseUrl}/api/cameras/${encodeURIComponent(cameraId)}/preview`;
  }

  async startCameraStream(cameraId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/cameras/${encodeURIComponent(cameraId)}/stream/start`, {
        method: 'POST',
      });
      const json = await res.json();
      return Boolean(json.data?.started);
    } catch {
      return false;
    }
  }

  async stopCameraStream(cameraId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/cameras/${encodeURIComponent(cameraId)}/stream/stop`, {
        method: 'POST',
      });
      const json = await res.json();
      return Boolean(json.data?.stopped);
    } catch {
      return false;
    }
  }

  async probeCameraConnection(config: {
    protocol?: string;
    streamUrl?: string;
    rtspUrl?: string;
    uri?: string;
    host?: string;
    port?: number;
    deviceIndex?: number;
    username?: string;
    password?: string;
  }): Promise<{ reachable: boolean; protocol: string; pingMs: number; capabilities?: any; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/cameras/probe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      return json.data || { reachable: false, protocol: config.protocol || 'RTSP', pingMs: 0, error: 'Probe failed' };
    } catch (err: any) {
      return { reachable: false, protocol: config.protocol || 'RTSP', pingMs: 0, error: err.message };
    }
  }

  async sendPtzCommand(cameraId: string, command: {
    action: 'START' | 'STOP' | 'GOTO_PRESET' | 'SET_PRESET' | 'HOME';
    panSpeed?: number;
    tiltSpeed?: number;
    zoomSpeed?: number;
    presetId?: string;
  }): Promise<{ success: boolean; message?: string; pan?: number; tilt?: number; zoom?: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/cameras/${encodeURIComponent(cameraId)}/ptz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      const json = await res.json();
      return json.data || { success: false, message: 'Command failed' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async getCameraCapabilities(cameraId: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/cameras/${encodeURIComponent(cameraId)}/capabilities`);
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  }

  async registerCamera(cameraData: {
    name: string;
    location: string;
    protocol?: string;
    streamUrl?: string;
    deviceIndex?: number;
    username?: string;
    password?: string;
    ptzEnabled?: boolean;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cameraData),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || json.message || 'Failed to register camera');
    }
    return json.data;
  }


  // ==========================================
  // ORACLE DETECTIONS & EXACT FRAME SERVING
  // ==========================================

  getDetectionImageUrl(detectionId: string | number): string {
    return `${this.baseUrl}/api/detections/${encodeURIComponent(detectionId)}/image`;
  }

  async getDetection(detectionId: string | number): Promise<any> {
    const token = localStorage.getItem('ctrlf_token');
    const res = await fetch(`${this.baseUrl}/api/detections/${encodeURIComponent(detectionId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Detection not found');
    }
    return json.data;
  }

  async createDetection(detectionData: any): Promise<any> {
    const token = localStorage.getItem('ctrlf_token');
    const res = await fetch(`${this.baseUrl}/api/detections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(detectionData),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to store detection');
    }
    return json.data;
  }
}

export const apiClient = new ApiClient();
