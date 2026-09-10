import { Router } from 'express';
import { cameraController } from '../controllers/cameraController';
import { calibrationController } from '../controllers/calibrationController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { createCameraSchema, updateCameraSchema, ptzCommandSchema } from '../validators/cameraValidator';
import { Permission } from '../types/user';

const router = Router();

router.use(authenticate);

router.post('/', authorize(Permission.CAMERA_MANAGE), validateRequest(createCameraSchema), cameraController.create);
router.get('/', authorize(Permission.CAMERA_VIEW), cameraController.getAll);
router.get('/:cameraId', authorize(Permission.CAMERA_VIEW), cameraController.getById);
router.put('/:cameraId', authorize(Permission.CAMERA_MANAGE), validateRequest(updateCameraSchema), cameraController.update);
router.delete('/:cameraId', authorize(Permission.CAMERA_MANAGE), cameraController.delete);
router.post('/probe', authorize(Permission.CAMERA_MANAGE), cameraController.probeConnection);
router.post('/test-connection', authorize(Permission.CAMERA_MANAGE), cameraController.probeConnection);
router.post('/:cameraId/test', authorize(Permission.CAMERA_MANAGE), cameraController.testConnection);
router.post('/:cameraId/connect', authorize(Permission.CAMERA_MANAGE), cameraController.connect);
router.post('/:cameraId/ptz', authorize(Permission.CAMERA_MANAGE), validateRequest(ptzCommandSchema), cameraController.sendPtzCommand);
router.get('/:cameraId/capabilities', authorize(Permission.CAMERA_VIEW), cameraController.getCapabilities);

// Streaming endpoints (Phase 8)
router.get('/:cameraId/health', authorize(Permission.CAMERA_VIEW), cameraController.getHealth);
router.get('/:cameraId/snapshot', authorize(Permission.CAMERA_VIEW), cameraController.getSnapshot);
router.get('/:cameraId/preview', authorize(Permission.CAMERA_VIEW), cameraController.getPreview);
router.post('/:cameraId/stream/start', authorize(Permission.CAMERA_MANAGE), cameraController.startStream);
router.post('/:cameraId/stream/stop', authorize(Permission.CAMERA_MANAGE), cameraController.stopStream);

// Calibration endpoints (Phase 7)
router.get('/:cameraId/calibration', authorize(Permission.CAMERA_VIEW), calibrationController.getCalibration);
router.put('/:cameraId/calibration', authorize(Permission.CAMERA_MANAGE), calibrationController.updateCalibration);
router.post('/:cameraId/calibration/map-detection', authorize(Permission.CAMERA_VIEW), calibrationController.mapDetection);

export default router;
