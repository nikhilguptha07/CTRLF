import path from 'path';
import { videoRepository } from '../repositories/videoRepository';
import { storageService } from './storageService';
import { auditService } from './auditService';
import { videoValidationService } from './videoValidationService';
import { AppError } from '../middleware/errorHandler';
import { Video } from '../types/video';

export class VideoService {
  async processUpload(
    userId: string,
    file: Express.Multer.File
  ): Promise<Video> {
    // 1. Comprehensive validation & real metadata extraction via videoValidationService
    const metadata = await videoValidationService.validateAndExtractMetadata(
      file.originalname,
      file.mimetype,
      file.buffer
    );

    // 2. Persist to partitioned original/ storage
    const stored = await storageService.save({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });

    // 3. Persist video entity with real computer-vision probed attributes
    const video = await videoRepository.create({
      id: stored.id,
      userId,
      originalFilename: file.originalname,
      storagePath: stored.storagePath,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      durationSeconds: metadata.durationSeconds,
      frameRate: metadata.frameRate,
      resolution: metadata.resolution,
      status: 'READY',
    });

    // 4. Audit trail with SHA-256 and metadata
    await auditService.record({
      userId,
      action: 'VIDEO_UPLOADED',
      resourceType: 'VIDEO',
      resourceId: video.id,
      status: 'SUCCESS',
      details: {
        filename: file.originalname,
        sizeBytes: file.size,
        sha256: metadata.sha256Checksum,
        durationSeconds: metadata.durationSeconds,
        resolution: metadata.resolution,
        fps: metadata.frameRate,
        frameCount: metadata.frameCount,
      },
    });

    return video;
  }

  async getVideos(userId: string): Promise<Video[]> {
    return videoRepository.findAllByUserId(userId);
  }

  async getVideoById(id: string, userId: string): Promise<Video> {
    const video = await videoRepository.findById(id, userId);
    if (!video) {
      throw new AppError('VIDEO_NOT_FOUND', 'Video footage record not found', 404);
    }
    return video;
  }

  async deleteVideo(id: string, userId: string): Promise<void> {
    const video = await videoRepository.findById(id, userId);
    if (!video) {
      throw new AppError('VIDEO_NOT_FOUND', 'Video footage record not found', 404);
    }

    await storageService.delete(video.storagePath);
    await videoRepository.delete(id, userId);

    await auditService.record({
      userId,
      action: 'VIDEO_DELETED',
      resourceType: 'VIDEO',
      resourceId: id,
      status: 'SUCCESS',
    });
  }
}

export const videoService = new VideoService();
