import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Permission } from '../types/user';

const router = Router();

// Cryptographic hash chain verification (Admin & Auditor)
router.get('/verify', authenticate, authorize(Permission.AUDIT_VIEW), auditController.verifyChain);

// View audit logs (Admin & Auditor)
router.get('/', authenticate, authorize(Permission.AUDIT_VIEW), auditController.getLogs);

export default router;
