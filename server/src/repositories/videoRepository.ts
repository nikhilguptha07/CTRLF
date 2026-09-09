import { db } from '../config/database';
import { Video, VideoStatus } from '../types/video';

interface VideoRow {
  ID: string;
  USER_ID: string;
  ORIGINAL_FILENAME: string;
  STORAGE_PATH: string;
  MIME_TYPE: string;
  FILE_SIZE_BYTES: number;
  DURATION_SECONDS?: number | null;
  FRAME_RATE?: number | null;
  RESOLUTION?: string | null;
  STATUS: string;
  CREATED_AT: Date | string;
}

export class VideoRepository {
  private mapRowToVideo(row: VideoRow): Video {
    return {
      id: row.ID,
      userId: row.USER_ID,
      originalFilename: row.ORIGINAL_FILENAME,
      storagePath: row.STORAGE_PATH,
      mimeType: row.MIME_TYPE,
      fileSizeBytes: Number(row.FILE_SIZE_BYTES),
      durationSeconds: row.DURATION_SECONDS !== null && row.DURATION_SECONDS !== undefined ? Number(row.DURATION_SECONDS) : null,
      frameRate: row.FRAME_RATE !== null && row.FRAME_RATE !== undefined ? Number(row.FRAME_RATE) : null,
      resolution: row.RESOLUTION || null,
      status: row.STATUS as VideoStatus,
      createdAt: new Date(row.CREATED_AT),
    };
  }

  async findById(id: string, userId?: string): Promise<Video | null> {
    let sql = `
      SELECT id, user_id, original_filename, storage_path, mime_type, file_size_bytes, duration_seconds, frame_rate, resolution, status, created_at
      FROM VIDEOS
      WHERE id = :id
    `;
    const binds: Record<string, unknown> = { id };

    if (userId) {
      sql += ` AND user_id = :userId`;
      binds.userId = userId;
    }

    const result = await db.execute<VideoRow>(sql, binds);
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToVideo(result.rows[0]);
  }

  async findAllByUserId(userId: string): Promise<Video[]> {
    const sql = `
      SELECT id, user_id, original_filename, storage_path, mime_type, file_size_bytes, duration_seconds, frame_rate, resolution, status, created_at
      FROM VIDEOS
      WHERE user_id = :userId
      ORDER BY created_at DESC
    `;
    const result = await db.execute<VideoRow>(sql, { userId });
    return (result.rows || []).map((row: VideoRow) => this.mapRowToVideo(row));
  }

  async findAll(): Promise<Video[]> {
    const sql = `
      SELECT id, user_id, original_filename, storage_path, mime_type, file_size_bytes, duration_seconds, frame_rate, resolution, status, created_at
      FROM VIDEOS
      ORDER BY created_at DESC
    `;
    const result = await db.execute<VideoRow>(sql, {});
    return (result.rows || []).map((row: VideoRow) => this.mapRowToVideo(row));
  }

  async create(video: Omit<Video, 'createdAt'>): Promise<Video> {
    const sql = `
      INSERT INTO VIDEOS (id, user_id, original_filename, storage_path, mime_type, file_size_bytes, duration_seconds, frame_rate, resolution, status)
      VALUES (:id, :userId, :originalFilename, :storagePath, :mimeType, :fileSizeBytes, :durationSeconds, :frameRate, :resolution, :status)
    `;
    await db.execute(sql, {
      id: video.id,
      userId: video.userId,
      originalFilename: video.originalFilename,
      storagePath: video.storagePath,
      mimeType: video.mimeType,
      fileSizeBytes: video.fileSizeBytes,
      durationSeconds: video.durationSeconds || null,
      frameRate: video.frameRate || null,
      resolution: video.resolution || null,
      status: video.status,
    });

    const created = await this.findById(video.id);
    if (!created) {
      throw new Error('Video creation failed');
    }
    return created;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const sql = `
      DELETE FROM VIDEOS
      WHERE id = :id AND user_id = :userId
    `;
    const result = await db.execute(sql, { id, userId });
    return (result.rowsAffected || 0) > 0;
  }
}

export const videoRepository = new VideoRepository();
