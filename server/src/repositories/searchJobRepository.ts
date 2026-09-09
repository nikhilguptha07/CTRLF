import { db } from '../config/database';
import { SearchJobRecord, SearchJobStatus } from '../types/camera';

interface SearchJobRow {
  ID: string;
  SESSION_ID: string;
  CAMERA_ID: string;
  JOB_STATUS: string;
  STARTED_AT: Date | string;
  ENDED_AT?: Date | string | null;
  FRAMES_PROCESSED: number;
  LAST_FRAME_AT?: Date | string | null;
  ERROR_MESSAGE?: string | null;
  CREATED_AT: Date | string;
}

export class SearchJobRepository {
  private mapRowToRecord(row: SearchJobRow): SearchJobRecord {
    return {
      id: row.ID,
      sessionId: row.SESSION_ID,
      cameraId: row.CAMERA_ID,
      jobStatus: row.JOB_STATUS as SearchJobStatus,
      startedAt: new Date(row.STARTED_AT),
      endedAt: row.ENDED_AT ? new Date(row.ENDED_AT) : null,
      framesProcessed: Number(row.FRAMES_PROCESSED) || 0,
      lastFrameAt: row.LAST_FRAME_AT ? new Date(row.LAST_FRAME_AT) : null,
      errorMessage: row.ERROR_MESSAGE || null,
      createdAt: new Date(row.CREATED_AT),
    };
  }

  async findBySessionId(sessionId: string): Promise<SearchJobRecord[]> {
    const sql = `
      SELECT id, session_id, camera_id, job_status, started_at, ended_at,
             frames_processed, last_frame_at, error_message, created_at
      FROM SEARCH_JOBS
      WHERE session_id = :sessionId
      ORDER BY created_at ASC
    `;
    const result = await db.execute<SearchJobRow>(sql, { sessionId });
    return (result.rows || []).map((row) => this.mapRowToRecord(row));
  }

  async findBySessionAndCamera(sessionId: string, cameraId: string): Promise<SearchJobRecord | null> {
    const sql = `
      SELECT id, session_id, camera_id, job_status, started_at, ended_at,
             frames_processed, last_frame_at, error_message, created_at
      FROM SEARCH_JOBS
      WHERE session_id = :sessionId AND camera_id = :cameraId
    `;
    const result = await db.execute<SearchJobRow>(sql, { sessionId, cameraId });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToRecord(result.rows[0]);
  }

  async create(job: Omit<SearchJobRecord, 'createdAt'>): Promise<SearchJobRecord> {
    const sql = `
      INSERT INTO SEARCH_JOBS (
        id, session_id, camera_id, job_status, started_at, ended_at,
        frames_processed, last_frame_at, error_message
      ) VALUES (
        :id, :sessionId, :cameraId, :jobStatus, :startedAt, :endedAt,
        :framesProcessed, :lastFrameAt, :errorMessage
      )
    `;
    await db.execute(sql, {
      id: job.id,
      sessionId: job.sessionId,
      cameraId: job.cameraId,
      jobStatus: job.jobStatus,
      startedAt: job.startedAt,
      endedAt: job.endedAt || null,
      framesProcessed: job.framesProcessed || 0,
      lastFrameAt: job.lastFrameAt || null,
      errorMessage: job.errorMessage || null,
    });

    const created = await this.findBySessionAndCamera(job.sessionId, job.cameraId);
    return created || { ...job, createdAt: new Date() };
  }

  async updateStatus(
    sessionId: string,
    cameraId: string,
    updates: Partial<Pick<SearchJobRecord, 'jobStatus' | 'endedAt' | 'framesProcessed' | 'lastFrameAt' | 'errorMessage'>>
  ): Promise<void> {
    const fields: string[] = [];
    const binds: Record<string, unknown> = { sessionId, cameraId };

    if (updates.jobStatus !== undefined) {
      fields.push('job_status = :jobStatus');
      binds.jobStatus = updates.jobStatus;
    }
    if (updates.endedAt !== undefined) {
      fields.push('ended_at = :endedAt');
      binds.endedAt = updates.endedAt;
    }
    if (updates.framesProcessed !== undefined) {
      fields.push('frames_processed = :framesProcessed');
      binds.framesProcessed = updates.framesProcessed;
    }
    if (updates.lastFrameAt !== undefined) {
      fields.push('last_frame_at = :lastFrameAt');
      binds.lastFrameAt = updates.lastFrameAt;
    }
    if (updates.errorMessage !== undefined) {
      fields.push('error_message = :errorMessage');
      binds.errorMessage = updates.errorMessage;
    }

    if (fields.length === 0) return;

    const sql = `
      UPDATE SEARCH_JOBS
      SET ${fields.join(', ')}
      WHERE session_id = :sessionId AND camera_id = :cameraId
    `;
    await db.execute(sql, binds);
  }
}

export const searchJobRepository = new SearchJobRepository();
