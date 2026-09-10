import { Router } from 'express';
import authRoutes from './authRoutes';
import cameraRoutes from './cameraRoutes';
import videoRoutes from './videoRoutes';
import searchRoutes from './searchRoutes';
import detectionRoutes from './detectionRoutes';
import historyRoutes from './historyRoutes';
import auditRoutes from './auditRoutes';
import evidenceRoutes from './evidenceRoutes';
import adminRoutes from './adminRoutes';
import { authenticate } from '../middleware/authMiddleware';
import { db } from '../config/database';
import { env } from '../config/env';

const router = Router();

// Lightweight Liveness Ping (Section 32)
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'CONTROL F Surveillance Intelligence Backend',
    timestamp: new Date().toISOString(),
    version: '2.5.0',
  });
});

// Comprehensive Production Readiness Check (Sections 32, 33, 34, 35)
router.get('/ready', async (_req, res) => {
  const checks: {
    oracle: { ok: boolean; mode: string; error?: string };
    aiService: { ok: boolean; status: string };
    system: { ready: boolean };
  } = {
    oracle: { ok: false, mode: 'UNKNOWN' },
    aiService: { ok: false, status: 'UNKNOWN' },
    system: { ready: false },
  };

  // 1. Oracle Connectivity Check via Lightweight Query (Section 33)
  try {
    const dbResult = await db.execute('SELECT 1 FROM DUAL');
    const isOk = Array.isArray(dbResult.rows) && dbResult.rows.length > 0;
    checks.oracle = {
      ok: isOk,
      mode: db.isMock() ? 'OFFLINE_IN_MEMORY' : 'ORACLE_21C_XE_THIN',
    };
  } catch (err: any) {
    checks.oracle = {
      ok: false,
      mode: 'DISCONNECTED',
      error: err.message,
    };
  }

  // 2. AI Service Health Check (Section 34)
  try {
    const { aiVisionService } = await import('../services/aiVisionService');
    const isAiHealthy = await (aiVisionService as any).provider.checkHealth();
    checks.aiService = {
      ok: isAiHealthy,
      status: isAiHealthy ? 'HEALTHY' : 'UNREACHABLE',
    };
  } catch {
    checks.aiService = {
      ok: false,
      status: 'OFFLINE',
    };
  }

  checks.system.ready = checks.oracle.ok;
  const statusCode = checks.system.ready ? 200 : 503;

  return res.status(statusCode).json({
    status: checks.system.ready ? 'READY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    checks,
  });
});

router.use('/auth', authRoutes);
router.use('/cameras', cameraRoutes);
router.use('/videos', videoRoutes);
router.use('/search', searchRoutes);
router.use('/searches', searchRoutes);
router.use('/detections', detectionRoutes);
router.use('/history', historyRoutes);
router.use('/search-history', historyRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/admin', adminRoutes);

// AI capability endpoints
router.get('/ai/classes', async (_req, res, next) => {
  try {
    const { aiVisionService } = await import('../services/aiVisionService');
    const classes = await (aiVisionService as any).provider.getSupportedClasses();
    res.status(200).json({ success: true, count: classes.length, classes });
  } catch (err) {
    next(err);
  }
});

router.get('/ai/health', async (_req, res, next) => {
  try {
    const { aiVisionService } = await import('../services/aiVisionService');
    const isHealthy = await (aiVisionService as any).provider.checkHealth();
    res.status(200).json({
      service: 'ctrl-f-ai',
      status: isHealthy ? 'healthy' : 'unhealthy',
      modelLoaded: isHealthy,
    });
  } catch (err) {
    next(err);
  }
});

// Legacy audit log endpoint - strictly ADMIN restricted
router.get('/logs', authenticate, async (req, res, next) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Audit logs are restricted to Administrators only.' },
      });
    }
    const { auditService } = await import('../services/auditService');
    const logs = await auditService.getRecentLogs(100);
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

// Phase 15: Development-only diagnostic endpoint for real video detection inspection
if (env.NODE_ENV !== 'production') {
  router.post('/debug/detect-video', async (req, res, next) => {
    try {
      const { video_path, target_query = 'bottle' } = req.body;
      const { aiVisionService } = await import('../services/aiVisionService');
      const result = await aiVisionService.processVideo(
        video_path,
        target_query,
        15.0,
        undefined,
        undefined,
        undefined
      );
      res.status(200).json({
        video: video_path,
        framesProcessed: result.tracks.reduce((acc: number, t: any) => acc + (t.totalDetections || 1), 0),
        targetFound: result.targetFound,
        lastKnownObservation: (result as any).bestCandidate || result.lastTargetObservation || result.bestDetection,
        detections: result.tracks.flatMap((t: any) =>
          (t.detections || []).map((d: any) => ({
            frame: d.frame_number,
            timestamp: d.timestamp_s,
            className: d.class_name,
            confidence: d.confidence,
            bbox: [d.bbox.x1, d.bbox.y1, d.bbox.x2, d.bbox.y2],
          }))
        ),
      });
    } catch (err) {
      next(err);
    }
  });
}

export default router;
