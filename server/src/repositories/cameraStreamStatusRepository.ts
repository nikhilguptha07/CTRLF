import { db } from '../config/database';
import { CameraStreamStatusRecord, StreamState } from '../types/camera';

interface StreamStatusRow {
  CAMERA_ID: string;
  STATUS: string;
  CONNECTED_AT?: Date | string | null;
  LAST_FRAME_AT?: Date | string | null;
  LAST_ERROR?: string | null;
  CURRENT_FPS: number;
  FRAMES_RECEIVED: number;
  FRAMES_DROPPED: number;
  RECONNECT_ATTEMPTS: number;
  UPDATED_AT: Date | string;
}

export class CameraStreamStatusRepository {
  private mapRowToRecord(row: StreamStatusRow): CameraStreamStatusRecord {
    return {
      cameraId: row.CAMERA_ID,
      status: row.STATUS as StreamState,
      connectedAt: row.CONNECTED_AT ? new Date(row.CONNECTED_AT) : null,
      lastFrameAt: row.LAST_FRAME_AT ? new Date(row.LAST_FRAME_AT) : null,
      lastError: row.LAST_ERROR || null,
      currentFps: Number(row.CURRENT_FPS) || 0.0,
      framesReceived: Number(row.FRAMES_RECEIVED) || 0,
      framesDropped: Number(row.FRAMES_DROPPED) || 0,
      reconnectAttempts: Number(row.RECONNECT_ATTEMPTS) || 0,
      updatedAt: new Date(row.UPDATED_AT),
    };
  }

  async findByCameraId(cameraId: string): Promise<CameraStreamStatusRecord | null> {
    const sql = `
      SELECT camera_id, status, connected_at, last_frame_at, last_error,
             current_fps, frames_received, frames_dropped, reconnect_attempts, updated_at
      FROM CAMERA_STREAM_STATUS
      WHERE camera_id = :cameraId
    `;
    const result = await db.execute<StreamStatusRow>(sql, { cameraId });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToRecord(result.rows[0]);
  }

  async findAll(): Promise<CameraStreamStatusRecord[]> {
    const sql = `
      SELECT camera_id, status, connected_at, last_frame_at, last_error,
             current_fps, frames_received, frames_dropped, reconnect_attempts, updated_at
      FROM CAMERA_STREAM_STATUS
    `;
    const result = await db.execute<StreamStatusRow>(sql);
    return (result.rows || []).map((row) => this.mapRowToRecord(row));
  }

  async upsert(record: CameraStreamStatusRecord): Promise<CameraStreamStatusRecord> {
    const existing = await this.findByCameraId(record.cameraId);

    if (existing) {
      const sql = `
        UPDATE CAMERA_STREAM_STATUS
        SET status = :status,
            connected_at = :connectedAt,
            last_frame_at = :lastFrameAt,
            last_error = :lastError,
            current_fps = :currentFps,
            frames_received = :framesReceived,
            frames_dropped = :framesDropped,
            reconnect_attempts = :reconnectAttempts,
            updated_at = CURRENT_TIMESTAMP
        WHERE camera_id = :cameraId
      `;
      await db.execute(sql, {
        cameraId: record.cameraId,
        status: record.status,
        connectedAt: record.connectedAt || null,
        lastFrameAt: record.lastFrameAt || null,
        lastError: record.lastError || null,
        currentFps: record.currentFps,
        framesReceived: record.framesReceived,
        framesDropped: record.framesDropped,
        reconnectAttempts: record.reconnectAttempts,
      });
    } else {
      const sql = `
        INSERT INTO CAMERA_STREAM_STATUS (
          camera_id, status, connected_at, last_frame_at, last_error,
          current_fps, frames_received, frames_dropped, reconnect_attempts
        ) VALUES (
          :cameraId, :status, :connectedAt, :lastFrameAt, :lastError,
          :currentFps, :framesReceived, :framesDropped, :reconnectAttempts
        )
      `;
      await db.execute(sql, {
        cameraId: record.cameraId,
        status: record.status,
        connectedAt: record.connectedAt || null,
        lastFrameAt: record.lastFrameAt || null,
        lastError: record.lastError || null,
        currentFps: record.currentFps,
        framesReceived: record.framesReceived,
        framesDropped: record.framesDropped,
        reconnectAttempts: record.reconnectAttempts,
      });
    }

    const updated = await this.findByCameraId(record.cameraId);
    return updated || record;
  }
}

export const cameraStreamStatusRepository = new CameraStreamStatusRepository();
