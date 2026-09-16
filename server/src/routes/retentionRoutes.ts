import { Router, Request, Response, NextFunction } from 'express';
import { retentionService, RetentionPreset } from '../services/retentionService';
import { optionalAuthenticate, authorize, requireRole } from '../middleware/authMiddleware';
import { Permission } from '../types/user';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.use(optionalAuthenticate);

/**
 * GET /api/retention
 * Returns current retention policy, total storage footprint, and eligible videos for purge
 */
router.get('/', authorize(Permission.RETENTION_VIEW), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await retentionService.getStatus();
    return sendSuccess(res, status);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/retention/policy
 * Updates retention policy (preset: 7d/30d/90d/custom, retentionDays, autoDeleteEnabled)
 * Enforced on backend: Only SUPER ADMIN / ADMIN can alter retention policy
 */
router.put('/policy', authorize(Permission.RETENTION_MANAGE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { preset, retentionDays, autoDeleteEnabled } = req.body;

    if (preset && !['7d', '30d', '90d', 'custom'].includes(preset)) {
      return sendError(res, 'INVALID_PRESET', 'Preset must be 7d, 30d, 90d, or custom', 400);
    }

    if (preset === 'custom' && (!retentionDays || Number(retentionDays) < 1)) {
      return sendError(res, 'INVALID_DAYS', 'Custom retention requires retentionDays >= 1', 400);
    }

    const updated = await retentionService.updatePolicy(
      {
        preset: preset as RetentionPreset,
        retentionDays: retentionDays ? Number(retentionDays) : undefined,
        autoDeleteEnabled: autoDeleteEnabled !== undefined ? Boolean(autoDeleteEnabled) : undefined,
      },
      req.user?.userId
    );

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/retention/purge
 * Actually triggers retention cleanup to delete expired recordings and disk files
 * Enforced on backend: requires RETENTION_MANAGE (SUPER ADMIN / SECURITY MANAGER)
 */
router.post('/purge', authorize(Permission.RETENTION_MANAGE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isDryRun = Boolean(req.body.dryRun);
    const result = await retentionService.executeRetentionCleanup({
      dryRun: isDryRun,
      triggeredBy: req.user?.email || 'MANUAL_API_TRIGGER',
      userId: req.user?.userId,
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
