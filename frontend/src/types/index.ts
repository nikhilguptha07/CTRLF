export type AppStage =
  | 'HOME'
  | 'OBJECT_INPUT'
  | 'PREPARING'
  | 'SEARCHING'
  | 'TARGET_ACQUIRED'
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'ERROR';

export type ExperienceStage = AppStage | 'INTRO' | 'QUESTION' | 'TRANSITION';

export interface DetectionResult {
  objectName: string;
  confidence: number;
  timestamp: string;
  camera: string;
  location: string;
  matchSnippet?: string;
  found: boolean;
}

export type FeedTab = 
  | 'home' 
  | 'search' 
  | 'cctv' 
  | 'upload' 
  | 'history' 
  | 'detected' 
  | 'settings' 
  | 'overview' 
  | 'heatmaps' 
  | 'logs';

export interface CameraFeedInfo {
  id: string;
  name: string;
  zone: string;
  resolution: string;
  fps: number;
  status: 'ONLINE' | 'ACTIVE_SEARCH' | 'OFFLINE';
  lastDetected?: string;
}
