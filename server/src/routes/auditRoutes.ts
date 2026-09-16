import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Permission } from '../types/user';

const router = Router();

// Cryptographic hash chain verification (SUPER ADMIN only)
router.get('/verify', authenticate, authorize(Permission.SYSTEM_CONFIGURE), auditController.verifyChain);

// View audit logs (SUPER ADMIN & SECURITY MANAGER)
router.get('/', authenticate, authorize(Permission.AUDIT_VIEW), auditController.getLogs);

// Record forensic & operational audit event (all 8 lifecycle events)
router.post('/event', authenticate, auditController.recordEvent);

export default router;
