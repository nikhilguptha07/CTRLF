export type SearchSourceType = 'VIDEO' | 'CAMERA' | 'ORCHESTRATOR';

export type SearchStage =
  | 'IDLE'
  | 'QUEUED'
  | 'SEARCHING'
  | 'INITIALIZING'
  | 'PROCESSING'
  | 'EXTRACTING_FRAMES'
  | 'ANALYZING'
  | 'TRACKING'
  | 'TARGET_ACQUIRED'
  | 'VERIFYING'
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'FAILED'
  | 'CANCELLED';

export interface SearchSession {
  id: string;
  userId: string;
  objectName: string;
  description?: string | null;
  sourceType: SearchSourceType;
  sourceId: string;
  status: SearchStage;
  progressPercent: number;
  startedAt: Date;
  completedAt?: Date | null;
  errorMessage?: string | null;
  winningCameraId?: string | null;
}

export interface SearchEvent {
  id: string;
  searchId: string;
  stage: SearchStage;
  progress: number;
  message: string;
  createdAt: Date;
}

export type CameraWorkerState =
  | 'QUEUED'
  | 'CONNECTING'
  | 'SEARCHING'
  | 'TARGET_FOUND'
  | 'NO_TARGET'
  | 'CANCELLED_PREEMPTED'
  | 'ERROR';

export interface CameraWorkerStatus {
  cameraId: string;
  cameraName: string;
  location?: string;
  status: CameraWorkerState;
  progressPercent: number;
  processedFrames: number;
  totalFrames: number;
  confidence?: number;
  trackId?: number | null;
  evidencePath?: string | null;
  cancelReason?: string;
}

export interface OrchestratorSessionStatus {
  sessionId: string;
  target: string;
  status: SearchStage;
  winningCameraId: string | null;
  cameras: Record<string, CameraWorkerStatus>;
  allDone: boolean;
}

