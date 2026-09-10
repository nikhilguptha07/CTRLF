import { Router } from 'express';
import { historyController } from '../controllers/historyController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Permission } from '../types/user';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Permission.DETECTION_VIEW), historyController.getSearches);
router.get('/audit', authorize(Permission.AUDIT_VIEW), historyController.getAuditLogs);

export default router;
