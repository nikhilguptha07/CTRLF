import { Router } from 'express';
import multer from 'multer';
import { videoController } from '../controllers/videoController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { Permission } from '../types/user';

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/ogg',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new AppError('INVALID_FILE_TYPE', `Invalid file type: "${file.mimetype}". Only valid video files are accepted.`, 415));
    }
  },
});

const router = Router();

router.use(authenticate);

router.post('/upload', authorize(Permission.VIDEO_UPLOAD), upload.single('video'), videoController.upload);
router.get('/', authorize(Permission.DETECTION_VIEW), videoController.getAll);
router.get('/:videoId', authorize(Permission.DETECTION_VIEW), videoController.getById);
router.delete('/:videoId', authorize(Permission.SYSTEM_CONFIGURE), videoController.delete);

export default router;
