import { Request, Response, NextFunction } from 'express';
import { cameraCalibrationService } from '../services/cameraCalibrationService';
import { cameraRepository } from '../repositories/cameraRepository';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class CalibrationController {
  /**
   * GET /api/cameras/:cameraId/calibration
   * Retrieve camera calibration metadata, intrinsics, extrinsics status, and distortion
   */
  async getCalibration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId } = req.params;
      if (!cameraId) {
        throw new AppError('INVALID_INPUT', 'Camera ID is required', 400);
      }

      const camera = await cameraRepository.findById(cameraId);
      const calibration = await cameraCalibrationService.getCalibration(cameraId);

      res.status(200).json({
        success: true,
        data: {
          cameraId: calibration.cameraId,
          cameraName: camera?.name || calibration.cameraId,
          location: camera?.location || 'Monitored Sector',
          resolution: {
            width: calibration.imageWidth,
            height: calibration.imageHeight,
          },
          intrinsics: {
            fx: calibration.fx,
            fy: calibration.fy,
            cx: calibration.cx,
            cy: calibration.cy,
          },
          distortion: {
            model: calibration.distortionModel,
            coefficients: calibration.distortionCoefficients || [0, 0, 0, 0, 0],
          },
          extrinsics: {
            status: 'EXTRINSICS_UNCALIBRATED',
            coordinateSystem: 'THREEJS_STUDIO_FRAME',
            defaultRigPosition: [0.36, 0.12, 0.1],
          },
          calibrationStatus: calibration.calibrationStatus,
          localizationMode: calibration.localizationMode,
          version: calibration.version,
          calibratedAt: calibration.calibratedAt,
          updatedAt: calibration.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/cameras/:cameraId/calibration
   * Update or calibrate camera intrinsics (Authorized operators/admins only)
   */
  async updateCalibration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId } = req.params;
      const userId = (req as any).user?.id || 'system';

      const updated = await cameraCalibrationService.updateCalibration(
        cameraId,
        req.body,
        userId
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: `Camera ${cameraId} calibration updated to version ${updated.version}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/cameras/:cameraId/calibration/map-detection
   * Map 2D bounding box to 3D viewing ray and CCTV pan/tilt angles
   */
  async mapDetection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId } = req.params;
      const { bbox, imageWidth, imageHeight, className, confidence, trackId, mode } = req.body;

      if (!bbox) {
        throw new AppError('INVALID_INPUT', 'Bounding box is required', 400);
      }

      const result = await cameraCalibrationService.mapDetectionTo3D(
        {
          bbox,
          imageWidth: Number(imageWidth) || 1920,
          imageHeight: Number(imageHeight) || 1080,
          className,
          confidence: Number(confidence) || 0,
          trackId,
        },
        cameraId,
        mode || 'RAY_ONLY'
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const calibrationController = new CalibrationController();
