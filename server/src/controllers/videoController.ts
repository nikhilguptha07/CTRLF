import { Request, Response, NextFunction } from 'express';
import { videoService } from '../services/videoService';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export class VideoController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('FILE_REQUIRED', 'Video file is required in multipart upload', 400);
      }

      const video = await videoService.processUpload(req.user!.userId, req.file);
      return sendSuccess(res, video, 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const videos = await videoService.getVideos(req.user!.userId);
      return sendSuccess(res, videos, 200);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const video = await videoService.getVideoById(req.params.videoId, req.user!.userId);
      return sendSuccess(res, video, 200);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await videoService.deleteVideo(req.params.videoId, req.user!.userId);
      return sendSuccess(res, { message: 'Video deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const videoController = new VideoController();
