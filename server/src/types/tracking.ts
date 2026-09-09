import { BoundingBox, DetectionCandidate } from './detection';

export type TrackingStatus = 'INITIALIZING' | 'TRACKING' | 'LOCKED' | 'LOST';

export interface WorldVector3 {
  x: number;
  y: number;
  z: number;
}

export interface TrackingResult {
  trackId: string;
  objectName: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
  status: TrackingStatus;
  worldPosition?: WorldVector3;
  cctvAimAngleDeg?: number;
}

export interface ActiveTrack {
  trackId: string;
  objectName: string;
  confidence: number;
  currentBox: BoundingBox;
  history: Array<{ box: BoundingBox; timestampMs: number; confidence: number }>;
  hitCount: number;
  missCount: number;
  lastUpdatedMs: number;
  status: TrackingStatus;
  worldPosition?: WorldVector3;
}

export interface ITrackingService {
  update(
    detections: DetectionCandidate[],
    timestampMs: number,
    targetName?: string
  ): TrackingResult[];
  reset(): void;
  getActiveTracks(): TrackingResult[];
  getLockedTarget(targetName: string): TrackingResult | null;
}
