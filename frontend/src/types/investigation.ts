/**
 * Investigation System Type Definitions
 * Phase 5 Specification: Dedicated Case File, Object Journey, Timeline, Notes, Activity Logs
 */

export type InvestigationStatus = 'ACTIVE' | 'CONFIRMED' | 'RECOVERED' | 'CLOSED';

export type InvestigationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CameraJourneyEvent {
  id: string;
  stepNumber: number;
  timestamp: string; // e.g. "14:32:15 UTC"
  timeShort: string; // e.g. "14:32"
  cameraId: string; // e.g. "CAM-07"
  cameraName: string; // e.g. "CAM-07 (West Transit Corridor)"
  location: string; // e.g. "West Transit Corridor • Zone 2"
  evidenceFrameUrl: string;
  originalFrameUrl?: string;
  confidence?: number;
  dwellTimeSeconds?: number;
  transitionNote?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type TimelineEventType = 
  | 'FIRST_DETECTION'
  | 'CAMERA_TRANSITION'
  | 'POSSIBLE_MATCH'
  | 'MATCH_CONFIRMED'
  | 'INVESTIGATION_CREATED'
  | 'RECOVERED'
  | 'CLOSED'
  | 'NOTE_ADDED'
  | 'REPORT_GENERATED';

export interface InvestigationTimelineEvent {
  id: string;
  timestamp: string; // ISO or formatted
  timeFormatted: string; // e.g. "14:32"
  title: string;
  description: string;
  type: TimelineEventType;
  camera?: string;
  location?: string;
  operator?: string;
}

export interface InvestigationNote {
  id: string;
  timestamp: string;
  timeFormatted: string;
  author: string;
  authorRole: string;
  content: string;
  flagged?: boolean;
}

export interface InvestigationActivity {
  id: string;
  timestamp: string;
  timeFormatted: string;
  actor: string;
  action: string;
  details?: string;
  category: 'AUDIT' | 'STATUS' | 'EVIDENCE' | 'VERIFICATION';
}

export interface InvestigationCase {
  caseId: string; // e.g. "INV-2026-00421"
  objectName: string; // e.g. "Black Backpack"
  objectClass: string;
  objectColor?: string;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  
  // Header / Summary metrics
  searchStartedAt: string;
  firstDetectionAt: string;
  lastDetectionAt: string;
  camerasAnalyzedCount: number;
  analyzedCameraIds: string[];
  positiveMatchesCount: number;
  lastKnownLocation: string;
  lastKnownCamera: string;
  
  // Assigned operator / metadata
  leadInvestigator: string;
  assignedUnit: string;
  evidenceHash: string; // SHA-256 integrity hash
  
  // Summary & Primary Evidence
  summaryNotes: string;
  primaryEvidenceUrl: string;
  originalEvidenceUrl?: string;
  primaryConfidence: number;
  
  // Core Sections
  cameraJourney: CameraJourneyEvent[];
  timeline: InvestigationTimelineEvent[];
  notes: InvestigationNote[];
  activityLog: InvestigationActivity[];
}
