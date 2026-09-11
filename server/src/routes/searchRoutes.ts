import { Router } from 'express';
import { searchController } from '../controllers/searchController';
import { optionalAuthenticate, authorize } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { createSearchSchema } from '../validators/searchValidator';
import { Permission } from '../types/user';

const router = Router();

router.use(optionalAuthenticate);

// Search Execution endpoints (Requires SEARCH_CREATE)
router.post('/start', authorize(Permission.SEARCH_CREATE), validateRequest(createSearchSchema), searchController.initiate);
router.post('/', authorize(Permission.SEARCH_CREATE), validateRequest(createSearchSchema), searchController.initiate);

// Search Cancellation (Requires SEARCH_CANCEL)
router.post('/:searchId/cancel', authorize(Permission.SEARCH_CANCEL), searchController.cancel);

// Search Telemetry and Status (Requires DETECTION_VIEW)
router.get('/:searchId', authorize(Permission.DETECTION_VIEW), searchController.getById);
router.get('/:searchId/progress', authorize(Permission.DETECTION_VIEW), searchController.getProgress);
router.get('/:searchId/evidence', authorize(Permission.EVIDENCE_VIEW), searchController.getEvidence);
router.get('/:searchId/evidence/frame', authorize(Permission.EVIDENCE_VIEW), searchController.getEvidenceFrame);
router.get('/:searchId/evidence/:evidenceId', authorize(Permission.EVIDENCE_VIEW), searchController.getEvidenceFrame);
router.get('/:searchId/detections', authorize(Permission.DETECTION_VIEW), searchController.getDetections);
router.get('/:searchId/events', authorize(Permission.DETECTION_VIEW), searchController.getEvents);
router.get('/:searchId/tracks', authorize(Permission.DETECTION_VIEW), searchController.getTracks);
router.get('/:searchId/orchestrator', authorize(Permission.DETECTION_VIEW), searchController.getOrchestratorStatus);

export default router;
