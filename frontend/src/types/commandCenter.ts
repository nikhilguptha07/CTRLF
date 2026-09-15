/**
 * Security Command Center - Core Type Definitions
 * Phase 3 Dashboard Specification
 */

export interface SystemStatus {
  camerasOnline: number;
  camerasOffline: number;
  aiEngineStatus: 'OPTIMAL' | 'DEGRADED' | 'OFFLINE';
  aiModelName: string;
  storageUsagePercent: number;
  storageText: string;
  lastDetection: {
    object: string;
    camera: string;
    timestamp: string;
    confidence: number;
  } | null;
  processingStatus: 'IDLE' | 'INFERENCE_ACTIVE' | 'STREAMING' | 'RECONSTRUCTION';
  fps: number;
  latencyMs: number;
}

export type InvestigationStatus = 'SEARCHING' | 'ANALYZING' | 'IN_PROGRESS' | 'RESOLVED' | 'SUSPENDED';

export interface ActiveInvestigation {
  caseId: string;
  object: string;
  status: InvestigationStatus;
  camera: string;
  confidence: number;
  lastDetectedTime: string;
  operator?: string;
  notes?: string;
}

export type DetectionStatus = 'CONFIRMED' | 'UNRESOLVED' | 'FLAGGED';

export interface RecentDetection {
  id: string;
  object: string;
  thumbnailUrl?: string;
  camera: string;
  location: string;
  timestamp: string;
  confidence: number;
  status: DetectionStatus;
  trackId?: number | string;
  color?: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertType = 'CAMERA_OFFLINE' | 'REVIEW_REQUIRED' | 'SYSTEM_WARNING';

export interface SecurityAlert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  timestamp: string;
  severity: AlertSeverity;
  source?: string;
  actionLabel?: string;
  actionPayload?: string;
  resolved?: boolean;
}

export interface CommandCenterPayload {
  systemStatus: SystemStatus;
  investigations: ActiveInvestigation[];
  recentDetections: RecentDetection[];
  alerts: SecurityAlert[];
  lastUpdated: string;
}
