export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  normalizedX?: number;
  normalizedY?: number;
  normalizedWidth?: number;
  normalizedHeight?: number;
}

export interface DetectionResult {
  id: string;
  searchId: string;
  found: boolean;
  confidence: number;
  detectedLabel: string;
  dominantColor?: string | null;
  colorConfidence?: number | null;
  secondaryColors?: string[] | null;
  frameTimestampMs?: number | null;
  lastSeenTimestampMs?: number | null;
  lastSeenFrame?: number | null;
  evidenceFramePath?: string | null;
  boundingBox?: BoundingBox | null;
  trackId?: number | string | null;
  createdAt: Date;
}
export interface DetectionCandidate {
  label: string;
  confidence: number;
  dominantColor?: string | null;
  colorConfidence?: number | null;
  secondaryColors?: string[] | null;
  boundingBox: BoundingBox;
  timestampMs: number;
  frameIndex: number;
  trackId?: number | string | null;
  lastSeenTimestampMs?: number | null;
  lastSeenFrame?: number | null;
}

export interface OracleDetectionRecord {
  detectionId: string | number;
  userId: string | number;
  searchId: string | number;
  cameraId?: string | number | null;
  objectName: string;
  confidence: number;
  timestampSeconds: number;
  videoTimestamp: string;
  frameNumber: number;
  boundingBox: BoundingBox;
  detectionStatus: string;
  hasImage: boolean;
  createdAt: Date;
}

export interface CreateDetectionInput {
  userId?: string | number;
  searchId?: string | number;
  cameraId?: string | number | null;
  objectName: string;
  confidence: number;
  timestampSeconds: number;
  videoTimestamp?: string;
  frameNumber: number;
  boundingBox: BoundingBox;
  detectionStatus?: string;
  image?: Buffer | string; // binary Buffer or base64 string
}


