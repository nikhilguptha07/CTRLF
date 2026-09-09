import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { AppError } from '../middleware/errorHandler';
import { resolveEvidencePath, resolveVideoPath, getCanonicalUploadDir } from '../utils/pathResolver';
import { evidenceRepository } from '../repositories/evidenceRepository';
import { detectionRepository } from '../repositories/detectionRepository';
import { searchRepository } from '../repositories/searchRepository';
import { videoRepository } from '../repositories/videoRepository';
import { aiVisionService } from '../services/aiVisionService';

export class EvidenceController {
  async getEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const rawEvidenceId = req.params.evidenceId;

      if (!rawEvidenceId || rawEvidenceId.includes('..') || rawEvidenceId.includes('/') || rawEvidenceId.includes('\\')) {
        throw new AppError('INVALID_EVIDENCE_ID', 'Invalid or malicious evidence identifier', 400);
      }

      const isOriginal = (req.query.type as string)?.toLowerCase() === 'original';
      const targetType = isOriginal ? 'original' : 'annotated';

      // 1. Check if direct file exists in canonical evidence storage
      const preExtracted = resolveEvidencePath(rawEvidenceId, targetType);
      if (preExtracted && fs.existsSync(preExtracted)) {
        const stats = fs.statSync(preExtracted);
        console.log(`[EVIDENCE DEBUG] Serving pre-extracted evidence: ${preExtracted}, size: ${stats.size} bytes`);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Length', String(stats.size));
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.sendFile(preExtracted);
      }

      // 2. Check relational repositories (EVIDENCE_FILES, DETECTIONS, SEARCH_SESSIONS)
      let videoRef: string | null = null;
      let frameNumber: number | null = null;
      let timestampMs: number | null = null;
      let bbox: any = null;
      let label: string = 'TARGET';
      let confidence: number = 90;
      let trackId: number | null = null;
      let dominantColor: string | null = null;

      // Check evidence repository
      const evRec = await evidenceRepository.findById(rawEvidenceId).catch(() => null);
      if (evRec) {
        frameNumber = evRec.frameNumber;
        timestampMs = evRec.timestampMs;
        trackId = evRec.trackId ?? null;
        confidence = evRec.confidence || 90;
        if (evRec.videoId) {
          const v = await videoRepository.findById(evRec.videoId).catch(() => null);
          videoRef = v?.storagePath || evRec.videoId;
        }
        if (!videoRef && evRec.sessionId) {
          const s = await searchRepository.findById(evRec.sessionId).catch(() => null);
          if (s?.sourceId) {
            const v = await videoRepository.findById(s.sourceId).catch(() => null);
            videoRef = v?.storagePath || s.sourceId;
          }
        }
      }

      // Check detection repository if not resolved
      if (!videoRef) {
        const detRec = await detectionRepository.findById(rawEvidenceId).catch(() => null);
        if (detRec) {
          frameNumber = (detRec as any).lastSeenFrame ?? (detRec.frameTimestampMs ? Math.round(detRec.frameTimestampMs / 33.33) : 90);
          timestampMs = detRec.frameTimestampMs ?? 3000;
          bbox = detRec.boundingBox;
          label = detRec.detectedLabel || 'TARGET';
          confidence = detRec.confidence || 90;
          trackId = detRec.trackId != null ? Number(detRec.trackId) : null;
          dominantColor = detRec.dominantColor ?? null;
          if (detRec.searchId) {
            const s = await searchRepository.findById(detRec.searchId).catch(() => null);
            if (s?.sourceId) {
              const v = await videoRepository.findById(s.sourceId).catch(() => null);
              videoRef = v?.storagePath || s.sourceId;
            }
          }
        }
      }

      // Check search session repository
      if (!videoRef) {
        const sessionRec = await searchRepository.findById(rawEvidenceId).catch(() => null);
        if (sessionRec) {
          label = sessionRec.objectName;
          if (sessionRec.sourceId) {
            const v = await videoRepository.findById(sessionRec.sourceId).catch(() => null);
            videoRef = v?.storagePath || sessionRec.sourceId;
          }
          const sRes = await searchRepository.findResultBySearchId(sessionRec.id).catch(() => null);
          frameNumber = sRes?.lastSeenFrame ?? 90;
          timestampMs = sRes?.lastSeenTimestamp ? Number(sRes.lastSeenTimestamp) * 1000 : 3000;
          bbox = sRes?.lastSeenBbox ? (typeof sRes.lastSeenBbox === 'string' ? JSON.parse(sRes.lastSeenBbox) : sRes.lastSeenBbox) : null;
          confidence = sRes?.lastSeenConfidence ?? 90;
          trackId = sRes?.matchedTrackId ?? null;
          dominantColor = sRes?.lastSeenColor ?? null;
        }
      }

      // 3. Fallback to latest uploaded video if videoRef still null
      if (!videoRef || videoRef === 'reference/cctv-reference.mp4') {
        const allVids = await videoRepository.findAll().catch(() => []);
        if (allVids.length > 0) {
          videoRef = allVids[0].storagePath || allVids[0].id;
        } else {
          videoRef = 'reference/cctv-reference.mp4';
        }
      }

      const resolvedVideo = resolveVideoPath(videoRef);
      console.log(`[EVIDENCE DEBUG] EvidenceController.getEvidence:`);
      console.log(`rawEvidenceId = ${rawEvidenceId}`);
      console.log(`path = ${resolvedVideo.path}`);
      console.log(`exists = ${resolvedVideo.exists}`);
      console.log(`size = ${resolvedVideo.fileSize}`);

      if (!resolvedVideo.exists || !resolvedVideo.path) {
        throw new AppError('EVIDENCE_NOT_FOUND', `Requested evidence frame does not exist (ID: ${rawEvidenceId})`, 404);
      }

      const extracted = await aiVisionService.extractVideoFrame({
        videoPath: resolvedVideo.path,
        frameNumber: frameNumber ?? 90,
        timestampMs: timestampMs ?? 3000,
        annotate: !isOriginal,
        bbox,
        label,
        confidence,
        trackId,
        dominantColor,
      });

      console.log(`[EVIDENCE DEBUG] On-demand extraction complete: size = ${extracted.buffer.length} bytes`);
      res.setHeader('Content-Type', extracted.contentType || 'image/jpeg');
      res.setHeader('Content-Length', String(extracted.buffer.length));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(extracted.buffer);
    } catch (err) {
      next(err);
    }
  }
}

export const evidenceController = new EvidenceController();

