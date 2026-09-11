import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { sendSuccess } from '../utils/response';
import { adminController } from '../controllers/adminController';

const router = Router();

// Protect all admin routes with strict authentication and ADMIN role requirement
// 401 Unauthorized if token missing / invalid
// 403 Forbidden if authenticated user is not ADMIN
router.use(authenticate);
router.use(requireRole('ADMIN'));

// 1. Overview KPIs
router.get('/stats', adminController.getOverview.bind(adminController));
router.get('/overview', adminController.getOverview.bind(adminController));

// 2. Database Status & Metadata (Safe, No Secrets)
router.get('/database', adminController.getDatabase.bind(adminController));

// 3. User Management
router.get('/users', adminController.getUsers.bind(adminController));
router.post('/users', adminController.createUser.bind(adminController));
router.patch('/users/:id', adminController.updateUser.bind(adminController));

// 4. Camera Management
router.get('/cameras', adminController.getCameras.bind(adminController));
router.post('/cameras', adminController.createCamera.bind(adminController));
router.patch('/cameras/:id', adminController.updateCamera.bind(adminController));

// 5. Search Sessions
router.get('/search-sessions', adminController.getSearchSessions.bind(adminController));
router.get('/search-sessions/:id', adminController.getSearchSessionDetail.bind(adminController));
router.get('/sessions', adminController.getSearchSessions.bind(adminController));

// 6. Detection Records
router.get('/detections', adminController.getDetections.bind(adminController));
router.get('/detections/:id', adminController.getDetectionDetail.bind(adminController));

// 7. Object Tracks
router.get('/tracks', adminController.getTracks.bind(adminController));

// 8. Audit Logs
router.get('/audit-logs', adminController.getAuditLogs.bind(adminController));

// 9. Approved Table Browser
router.get('/tables/:tableName', adminController.getTableData.bind(adminController));

// 10. Database Purge Action
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
