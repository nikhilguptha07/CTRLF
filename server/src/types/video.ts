export type VideoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR';

export interface Video {
  id: string;
  userId: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number | null;
  frameRate?: number | null;
  resolution?: string | null;
  status: VideoStatus;
  createdAt: Date;
}
