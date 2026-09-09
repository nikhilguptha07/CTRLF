export interface EvidenceRecord {
  id: string;
  sessionId: string;
  detectionId?: string | null;
  trackId?: number | null;
  videoId?: string | null;
  frameNumber: number;
  timestampMs: number;
  originalImagePath: string;
  annotatedImagePath?: string | null;
  selectionPolicy: string;
  confidence?: number | null;
  createdAt: Date;
}

export type CreateEvidenceInput = Omit<EvidenceRecord, 'createdAt'>;
