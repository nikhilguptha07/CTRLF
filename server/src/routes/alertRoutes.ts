import { Router, Request, Response, NextFunction } from 'express';
import { alertService } from '../services/alertService';
import { optionalAuthenticate, authorize } from '../middleware/authMiddleware';
import { Permission } from '../types/user';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.use(optionalAuthenticate);

// GET /api/alerts - List all operational alerts
router.get('/', authorize(Permission.ALERT_MANAGE), (_req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = alertService.getAlerts();
    return sendSuccess(res, alerts);
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', authorize(Permission.ALERT_MANAGE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await alertService.acknowledgeAlert(req.params.id, req.user?.userId);
    if (!alert) {
      return sendError(res, 'ALERT_NOT_FOUND', 'Alert not found', 404);
    }
    return sendSuccess(res, alert);
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/resolve
router.post('/:id/resolve', authorize(Permission.ALERT_MANAGE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await alertService.resolveAlert(req.params.id, req.user?.userId);
    if (!alert) {
      return sendError(res, 'ALERT_NOT_FOUND', 'Alert not found', 404);
    }
    return sendSuccess(res, alert);
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts - Create custom operational alert
router.post('/', authorize(Permission.ALERT_MANAGE), (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, severity, source, description, actionLabel, actionRoute } = req.body;
    if (!type || !severity || !source || !description) {
      return sendError(res, 'VALIDATION_ERROR', 'type, severity, source, and description are required', 400);
    }

    const created = alertService.createAlert({
      type,
      severity,
      source,
      description,
      actionLabel,
      actionRoute,
    });
    return sendSuccess(res, created, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
