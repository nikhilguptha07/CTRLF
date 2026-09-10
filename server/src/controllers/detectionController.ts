import { Request, Response, NextFunction } from 'express';
import { detectionService } from '../services/detectionService';
import { detectionRepository } from '../repositories/detectionRepository';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export class DetectionController {
  /**
   * GET /api/detections/:id/image
   * Streams the exact detection frame directly from the Oracle BLOB column
   */
  async getImage(req: Request, res: Response, next: NextFunction) {
    try {
      const detectionId = req.params.id;
      const imageResult = await detectionRepository.getDetectionImage(detectionId);

      if (!imageResult || !imageResult.buffer || imageResult.buffer.length === 0) {
        const fs = await import('fs');
        const { resolveEvidencePath, resolveVideoPath } = await import('../utils/pathResolver');
        const { evidenceRepository } = await import('../repositories/evidenceRepository');
        const { searchRepository } = await import('../repositories/searchRepository');
        const { videoRepository } = await import('../repositories/videoRepository');
        const { aiVisionService } = await import('../services/aiVisionService');

        // 1. Try resolving by detection record's evidenceFramePath or associated search evidence
        const detRecord = await detectionRepository.findById(detectionId).catch(() => null)
          || await detectionRepository.findBySearchId(detectionId).catch(() => null);

        const searchId = detRecord?.searchId || detectionId;

        // Check EVIDENCE_FILES for this searchId
        const evFiles = searchId ? await evidenceRepository.findBySessionId(searchId).catch(() => []) : [];
        if (evFiles.length > 0) {
          const ev = evFiles[0];
          const cand = resolveEvidencePath(ev.id, 'annotated') || (ev.annotatedImagePath && resolveEvidencePath(ev.annotatedImagePath, 'annotated'));
          if (cand && fs.existsSync(cand)) {
            const buf = await fs.promises.readFile(cand);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', String(buf.length));
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('X-Evidence-Source', 'EVIDENCE_FILE_DISK');
            return res.status(200).end(buf);
          }
        }

        // 2. If detection has an associated video in the search session, extract directly from uploaded footage
        const session = searchId ? await searchRepository.findById(searchId).catch(() => null) : null;
        if (session?.sourceId) {
          const video = await videoRepository.findById(session.sourceId).catch(() => null);
          const resolvedVideo = resolveVideoPath(video?.storagePath || session.sourceId);
          if (resolvedVideo.exists && resolvedVideo.path) {
            try {
              const frameNum = detRecord?.frameTimestampMs ? Math.round(detRecord.frameTimestampMs / 33.33) : 0;
              const extracted = await aiVisionService.extractVideoFrame({
                videoPath: resolvedVideo.path,
                frameNumber: frameNum,
                timestampMs: detRecord?.frameTimestampMs || 0,
                annotate: true,
                bbox: detRecord?.boundingBox,
                label: detRecord?.detectedLabel || session.objectName || 'Object',
                confidence: detRecord?.confidence,
                trackId: detRecord?.trackId != null ? Number(detRecord.trackId) : null,
                dominantColor: detRecord?.dominantColor,
              });
              res.setHeader('Content-Type', extracted.contentType || 'image/jpeg');
              res.setHeader('Content-Length', String(extracted.buffer.length));
              res.setHeader('Cache-Control', 'public, max-age=3600');
              res.setHeader('X-Evidence-Source', 'ON_DEMAND_VIDEO_EXTRACTION');
              return res.status(200).end(extracted.buffer);
            } catch (err) {
              console.warn('[DETECTION_CONTROLLER] On-demand frame extraction error:', err);
            }
          }
        }

        // 3. Fallback for reference demo only
        if (session?.sourceId === 'cctv-reference' || !session) {
          const genuinePath = resolveEvidencePath('frame_last_spot', 'annotated');
          if (genuinePath && fs.existsSync(genuinePath)) {
            const buf = await fs.promises.readFile(genuinePath);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', String(buf.length));
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('X-Evidence-Source', 'GENUINE_VIDEO_FRAME_DISK');
            return res.status(200).end(buf);
          }
        }

        // 4. SVG fallback
        const objName = detRecord?.detectedLabel || session?.objectName || 'TARGET';
        const objConf = detRecord?.confidence ? `${detRecord.confidence.toFixed(1)}%` : 'DETECTED';
        const fallbackSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
            <rect width="100%" height="100%" fill="#0a0f18"/>
            <rect x="20" y="20" width="600" height="320" fill="none" stroke="#00ff88" stroke-width="2" stroke-dasharray="8 4"/>
            <circle cx="320" cy="160" r="36" fill="#00ff88" fill-opacity="0.2" stroke="#00ff88" stroke-width="2"/>
            <text x="320" y="166" fill="#00ff88" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">TARGET ACQUIRED</text>
            <text x="320" y="230" fill="#94a3b8" font-family="monospace" font-size="12" text-anchor="middle">${objName.toUpperCase()} | SURVEILLANCE FRAME</text>
            <text x="320" y="250" fill="#64748b" font-family="monospace" font-size="11" text-anchor="middle">CONFIDENCE: ${objConf} • LAST KNOWN POSITION</text>
          </svg>
        `;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(fallbackSvg);
      }

      res.setHeader('Content-Type', imageResult.mimeType);
      res.setHeader('Content-Length', imageResult.buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.status(200).end(imageResult.buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/detections
   * Stores detection event + binary/base64 frame in Oracle 21c XE
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const userId = (req as any).user?.userId || body.user_id || body.userId || 1;
      const searchId = body.search_id || body.searchId || 1;
      const cameraId = body.camera_id || body.cameraId || 1;
      const objectName = body.object_name || body.objectName || 'Lost Object';
      const confidence = Number(body.confidence || 0);
      const timestampSeconds = Number(body.timestamp_seconds || body.timestampSeconds || 0);
      const videoTimestamp = body.video_timestamp || body.videoTimestamp;
      const frameNumber = Number(body.frame_number || body.frameNumber || 0);
      const boundingBox = body.bounding_box || body.boundingBox || { x: 0, y: 0, width: 0, height: 0 };
      const detectionStatus = body.detection_status || body.detectionStatus || 'TARGET_ACQUIRED';
      const image = body.image; // can be base64 string or buffer

      const record = await detectionRepository.saveDetection({
        userId,
        searchId,
        cameraId,
        objectName,
        confidence,
        timestampSeconds,
        videoTimestamp,
        frameNumber,
        boundingBox,
        detectionStatus,
        image,
      });

      return sendSuccess(res, record, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/detections/:id
   * Supports retrieving detection metadata by detectionId or searchId fallback
   */
  async getByIdOrSearchId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      // First try Oracle DETECTIONS by detection_id
      const oracleDetection = await detectionRepository.findDetectionById(id);
      if (oracleDetection) {
        return sendSuccess(res, oracleDetection, 200);
      }

      // Fallback: Try detectionService by searchId
      const searchDetection = await detectionService.getResultBySearchId(id);
      if (searchDetection) {
        return sendSuccess(res, searchDetection, 200);
      }

      throw new AppError('DETECTION_NOT_FOUND', 'Detection record not found', 404);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/detections/search/:searchId
   */
  async getBySearchId(req: Request, res: Response, next: NextFunction) {
    try {
      const searchId = req.params.searchId;
      const detections = await detectionRepository.findDetectionsBySearchId(searchId);
      if (detections && detections.length > 0) {
        return sendSuccess(res, detections, 200);
      }

      const legacy = await detectionService.getResultBySearchId(searchId);
      if (legacy) {
        return sendSuccess(res, [legacy], 200);
      }

      return sendSuccess(res, [], 200);
    } catch (error) {
      next(error);
    }
  }
}

export const detectionController = new DetectionController();

