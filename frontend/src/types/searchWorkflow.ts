/**
 * Search Workflow Types
 * Phase 4: Core Find Object Workflow (Search -> Scan -> Detect -> Verify)
 */

export type DatePreset = 'today' | '24h' | '3days' | 'custom';

export type TimeRangePreset = 'all' | 'shift' | 'morning' | 'afternoon' | 'custom';

export interface SearchParameters {
  object: string;
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  timeRangePreset: TimeRangePreset;
  startTime: string;
  endTime: string;
  cameraId: string;
  location: string;
  notes?: string;
}

export type VerificationReason =
  | 'WRONG_OBJECT'
  | 'POOR_IMAGE'
  | 'WRONG_LOCATION'
  | 'FALSE_DETECTION'
  | 'OTHER';

export interface HumanVerificationState {
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  reason?: VerificationReason;
  notes?: string;
  verifiedAt?: string;
  operator?: string;
}

export interface CameraScanProgress {
  totalCameras: number;
  activeCameras: number;
  offlineCameras: number;
  currentCameraId: string;
  currentLocation: string;
  framesAnalyzed: number;
  totalFrames: number;
  potentialMatches: number;
  progressPercent: number;
  sweepDegree: number;
  sweepCount: number;
  scanPhase: 'SEARCHING' | 'POSSIBLE_MATCH' | 'CONFIRMED' | 'ERROR';
}
