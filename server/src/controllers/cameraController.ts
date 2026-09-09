import { Request, Response, NextFunction } from 'express';
import { cameraService } from '../services/cameraService';
import { cameraStreamingService } from '../services/cameraStreamingService';
import { sendSuccess } from '../utils/response';

export class CameraController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = await cameraService.createCamera(req.user!.userId, req.body);
      return sendSuccess(res, camera, 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const cameras = await cameraService.getCameras(req.user!.userId);
      return sendSuccess(res, cameras, 200);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = await cameraService.getCameraById(req.params.cameraId, req.user!.userId);
      return sendSuccess(res, camera, 200);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = await cameraService.updateCamera(
        req.params.cameraId,
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, camera, 200);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await cameraService.deleteCamera(req.params.cameraId, req.user!.userId);
      return sendSuccess(res, { message: 'Camera deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }

  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cameraService.testConnection(req.params.cameraId, req.user!.userId);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async probeConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cameraService.probeRawConnection(req.body);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async sendPtzCommand(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cameraService.sendPtzCommand(req.params.cameraId, req.user!.userId, req.body);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getCapabilities(req: Request, res: Response, next: NextFunction) {
    try {
      const capabilities = await cameraService.getCameraCapabilities(req.params.cameraId, req.user!.userId);
      return sendSuccess(res, capabilities, 200);
    } catch (error) {
      next(error);
    }
  }

  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = await cameraService.getCameraById(req.params.cameraId, req.user!.userId);
      return sendSuccess(res, {
        cameraId: camera.id,
        name: camera.name,
        streamActive: true,
        protocol: 'WSS_RTSP_RELAY',
        status: 'ONLINE',
      }, 200);
    } catch (error) {
      next(error);
    }
  }

  // --- Phase 8 Real Streaming Endpoints ---

  async getHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const { cameraId } = req.params;
      const health = await cameraStreamingService.getCameraHealth(cameraId);
      return sendSuccess(res, health, 200);
    } catch (error) {
      next(error);
    }
  }

  async getSnapshot(req: Request, res: Response, next: NextFunction) {
    try {
      const { cameraId } = req.params;
      const snapshot = await cameraStreamingService.getCameraSnapshot(cameraId);
      if (!snapshot) {
        return res.status(503).json({ error: 'Snapshot currently unavailable for camera feed' });
      }
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(snapshot);
    } catch (error) {
      next(error);
    }
  }

  async getPreview(req: Request, res: Response, next: NextFunction) {
    try {
      const { cameraId } = req.params;
      const { contentType, stream } = await cameraStreamingService.getCameraPreviewStream(cameraId);

      res.setHeader(
        'Content-Type',
        contentType || 'multipart/x-mixed-replace; boundary=frame'
      );
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Connection', 'close');
      res.setHeader('Pragma', 'no-cache');

      stream.pipe(res);

      req.on('close', () => {
        try {
          stream.destroy();
        } catch {
          // stream destroyed cleanly
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async startStream(req: Request, res: Response, next: NextFunction) {
    try {
      const { cameraId } = req.params;
      const started = await cameraStreamingService.startCameraStream(cameraId);
      return sendSuccess(res, { cameraId, started }, 200);
    } catch (error) {
      next(error);
    }
  }

  async stopStream(req: Request, res: Response, next: NextFunction) {
    try {
      const { cameraId } = req.params;
      const stopped = await cameraStreamingService.stopCameraStream(cameraId);
      return sendSuccess(res, { cameraId, stopped }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const cameraController = new CameraController();
