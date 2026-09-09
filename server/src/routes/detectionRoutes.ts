import { Router } from 'express';
import { detectionController } from '../controllers/detectionController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Permission } from '../types/user';

const router = Router();

// Exact captured detection frame streaming from Oracle BLOB
// Allows browser <img src="/api/detections/:id/image"> loading with session cookie or public/auth token
router.get('/:id/image', detectionController.getImage);

// Authenticated detection endpoints
router.use(authenticate);

router.post('/', authorize(Permission.SEARCH_CREATE), detectionController.create);
router.get('/search/:searchId', authorize(Permission.DETECTION_VIEW), detectionController.getBySearchId);
router.get('/:id', authorize(Permission.DETECTION_VIEW), detectionController.getByIdOrSearchId);

export default router;

