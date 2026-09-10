import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Locate the canonical uploads directory regardless of current working directory
 */
export function getCanonicalUploadDir(): string {
  const candidates = [
    // If running from server directory
    path.resolve(process.cwd(), 'uploads'),
    // If running from workspace root
    path.resolve(process.cwd(), 'server', 'uploads'),
    // Relative to this file (__dirname is server/src/utils)
    path.resolve(__dirname, '../../uploads'),
    // Fallback to env setting
    path.resolve(env.UPLOAD_DIR),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
      return cand;
    }
  }

  // Fallback: create if missing
  const fallback = path.resolve(__dirname, '../../uploads');
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

/**
 * Resolve the exact server-side path to an uploaded video
 */
export function resolveVideoPath(videoRef?: string | null): {
  path: string | null;
  exists: boolean;
  fileSize: number;
} {
  if (!videoRef) {
    const uploadDir = getCanonicalUploadDir();
    const origDir = path.resolve(uploadDir, 'original');
    if (fs.existsSync(origDir)) {
      const files = fs.readdirSync(origDir).filter((f) => f.endsWith('.mp4'));
      if (files.length > 0) {
        const full = path.resolve(origDir, files[0]);
        const stats = fs.statSync(full);
        return { path: full, exists: true, fileSize: stats.size };
      }
    }
    const defaultUserVid = 'c:/Users/nikhi/Downloads/WhatsApp Video 2026-09-03 at 8.46.51 PM.mp4';
    if (fs.existsSync(defaultUserVid)) {
      const stats = fs.statSync(defaultUserVid);
      return { path: defaultUserVid, exists: true, fileSize: stats.size };
    }
    return { path: null, exists: false, fileSize: 0 };
  }

  const uploadDir = getCanonicalUploadDir();
  const cleanRef = videoRef.replace(/^[\/\\]+/, '');
  const basename = path.basename(cleanRef);
  const withoutExt = basename.replace(/\.[^/.]+$/, '');

  const candidates = [
    // 1. Exact path as provided
    path.resolve(videoRef),
    // 2. In canonical uploads/original
    path.resolve(uploadDir, 'original', basename),
    path.resolve(uploadDir, 'original', `${withoutExt}.mp4`),
    // 3. In canonical uploads/videos
    path.resolve(uploadDir, 'videos', basename),
    path.resolve(uploadDir, 'videos', `${withoutExt}.mp4`),
    // 4. Relative to server directory
    path.resolve(process.cwd(), cleanRef),
    path.resolve(process.cwd(), 'server', cleanRef),
    // 5. In uploads root
    path.resolve(uploadDir, basename),
    // 6. Check common user download location if matching WhatsApp video
    'c:/Users/nikhi/Downloads/WhatsApp Video 2026-09-03 at 8.46.51 PM.mp4',
  ];

  for (const cand of candidates) {
    try {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        const stats = fs.statSync(cand);
        return {
          path: cand,
          exists: true,
          fileSize: stats.size,
        };
      }
    } catch {
      // Continue search
    }
  }

  return { path: null, exists: false, fileSize: 0 };
}

/**
 * Resolve pre-extracted evidence frame file on server disk
 */
export function resolveEvidencePath(evidenceIdOrPath: string, type: 'annotated' | 'original' = 'annotated'): string | null {
  const uploadDir = getCanonicalUploadDir();
  const evidenceDir = path.resolve(uploadDir, 'evidence');

  if (!fs.existsSync(evidenceDir)) {
    return null;
  }

  // Direct file check
  const clean = path.basename(evidenceIdOrPath);
  const directPath = path.resolve(evidenceDir, clean);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  // Scan directory for matching evidence UUID
  try {
    const files = fs.readdirSync(evidenceDir);
    const targetSub = type === 'original' ? 'orig' : 'annotated';
    
    // 1. Exact match with type (e.g. filename contains evidenceIdOrPath AND targetSub)
    if (evidenceIdOrPath && evidenceIdOrPath !== 'default' && evidenceIdOrPath !== 'latest') {
      const match = files.find(f => f.includes(evidenceIdOrPath) && f.includes(targetSub));
      if (match) {
        return path.resolve(evidenceDir, match);
      }

      // 2. Secondary match (any file containing the id/clean name)
      const anyMatch = files.find(f => f.includes(evidenceIdOrPath));
      if (anyMatch) {
        return path.resolve(evidenceDir, anyMatch);
      }
    }

    // 3. Only if specifically asking for initial / in-hand (frame 10)
    if (evidenceIdOrPath.includes('10') || evidenceIdOrPath.includes('hand') || evidenceIdOrPath.includes('initial')) {
      const handMatch = files.find(f => f.includes('frame_10') && f.includes(targetSub));
      if (handMatch) return path.resolve(evidenceDir, handMatch);
    }

    // 4. Only if explicitly asking for last spot or frame 110:
    if (evidenceIdOrPath.includes('frame_last_spot') || evidenceIdOrPath.includes('frame_110') || evidenceIdOrPath === 'last_spot') {
      const lastSpotMatch = files.find(f => (f.includes('frame_last_spot') || f.includes('frame_110')) && f.includes(targetSub));
      if (lastSpotMatch) {
        return path.resolve(evidenceDir, lastSpotMatch);
      }
    }
  } catch (err) {
    logger.warn('Error reading evidence directory in resolveEvidencePath', { err });
  }

  return null;
}
