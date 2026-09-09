import { Router } from 'express';
import { evidenceController } from '../controllers/evidenceController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Permission } from '../types/user';

const router = Router();

// Authenticated / Authorized Evidence Serving (Section 24)
router.get(
  '/:evidenceId',
  authenticate,
  authorize(Permission.EVIDENCE_VIEW),
  evidenceController.getEvidence
);

export default router;
