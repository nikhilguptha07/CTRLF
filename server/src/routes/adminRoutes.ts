import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { sendSuccess } from '../utils/response';

const router = Router();

// Protect all admin routes with strict authentication and ADMIN role requirement
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.post('/clear-database', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.clearOperationalData();
    await authService.seedDefaultUsers();

    await auditService.record({
      userId: req.user?.userId,
      action: 'DATABASE_PURGED_BY_ADMIN',
      resourceType: 'DATABASE',
      resourceId: 'ORACLE_21C_XE',
      status: 'SUCCESS',
      details: {
        adminEmail: req.user?.email,
        clearedTables: result.cleared,
        recordsRemoved: result.count,
        timestamp: new Date().toISOString(),
      },
    });

    return sendSuccess(res, {
      message: 'Operational database data purged cleanly. Core system and users restored.',
      clearedTables: result.cleared,
      recordsRemoved: result.count,
    }, 200);
  } catch (err) {
    next(err);
  }
});

export default router;
