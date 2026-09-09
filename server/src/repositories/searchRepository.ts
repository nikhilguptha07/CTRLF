import { db } from '../config/database';
import { SearchSession, SearchStage, SearchSourceType, SearchEvent } from '../types/search';

interface SearchSessionRow {
  ID: string;
  USER_ID: string;
  OBJECT_NAME: string;
  DESCRIPTION?: string | null;
  SOURCE_TYPE: string;
  SOURCE_ID: string;
  STATUS: string;
  PROGRESS_PERCENT: number;
  STARTED_AT: Date | string;
  COMPLETED_AT?: Date | string | null;
  ERROR_MESSAGE?: string | null;
}

interface SearchEventRow {
  ID: string;
  SEARCH_ID: string;
  STAGE: string;
  PROGRESS: number;
  MESSAGE: string;
  CREATED_AT: Date | string;
}

export class SearchRepository {
  private mapRowToSession(row: SearchSessionRow): SearchSession {
    return {
      id: row.ID,
      userId: row.USER_ID,
      objectName: row.OBJECT_NAME,
      description: row.DESCRIPTION || null,
      sourceType: row.SOURCE_TYPE as SearchSourceType,
      sourceId: row.SOURCE_ID,
      status: row.STATUS as SearchStage,
      progressPercent: Number(row.PROGRESS_PERCENT),
      startedAt: new Date(row.STARTED_AT),
      completedAt: row.COMPLETED_AT ? new Date(row.COMPLETED_AT) : null,
      errorMessage: row.ERROR_MESSAGE || null,
    };
  }

  async findById(id: string, userId?: string): Promise<SearchSession | null> {
    let sql = `
      SELECT id, user_id, object_name, description, source_type, source_id, status, progress_percent, started_at, completed_at, error_message
      FROM SEARCH_SESSIONS
      WHERE id = :id
    `;
    const binds: Record<string, unknown> = { id };

    if (userId) {
      sql += ` AND user_id = :userId`;
      binds.userId = userId;
    }

    const result = await db.execute<SearchSessionRow>(sql, binds);
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToSession(result.rows[0]);
  }

  async findAllByUserId(userId: string, limit = 50): Promise<SearchSession[]> {
    const sql = `
      SELECT id, user_id, object_name, description, source_type, source_id, status, progress_percent, started_at, completed_at, error_message
      FROM SEARCH_SESSIONS
      WHERE user_id = :userId
      ORDER BY started_at DESC
      FETCH FIRST :limit ROWS ONLY
    `;
    const result = await db.execute<SearchSessionRow>(sql, { userId, limit });
    return (result.rows || []).map((row: SearchSessionRow) => this.mapRowToSession(row));
  }

  async findAll(limit = 50): Promise<SearchSession[]> {
    const sql = `
      SELECT id, user_id, object_name, description, source_type, source_id, status, progress_percent, started_at, completed_at, error_message
      FROM SEARCH_SESSIONS
      ORDER BY started_at DESC
      FETCH FIRST :limit ROWS ONLY
    `;
    const result = await db.execute<SearchSessionRow>(sql, { limit });
    return (result.rows || []).map((row: SearchSessionRow) => this.mapRowToSession(row));
  }

  async create(session: Omit<SearchSession, 'startedAt' | 'completedAt' | 'errorMessage'>): Promise<SearchSession> {
    const sql = `
      INSERT INTO SEARCH_SESSIONS (id, user_id, object_name, description, source_type, source_id, status, progress_percent)
      VALUES (:id, :userId, :objectName, :description, :sourceType, :sourceId, :status, :progressPercent)
    `;
    await db.execute(sql, {
      id: session.id,
      userId: session.userId,
      objectName: session.objectName,
      description: session.description || null,
      sourceType: session.sourceType,
      sourceId: session.sourceId,
      status: session.status,
      progressPercent: session.progressPercent,
    });

    const created = await this.findById(session.id);
    if (!created) {
      throw new Error('Search session creation failed');
    }
    return created;
  }

  async updateProgress(
    id: string,
    status: SearchStage,
    progressPercent: number,
    errorMessage?: string | null
  ): Promise<void> {
    const isTerminal = ['DETECTED', 'NOT_DETECTED', 'FAILED', 'CANCELLED'].includes(status);
    const sql = `
      UPDATE SEARCH_SESSIONS
      SET status = :status,
          progress_percent = :progressPercent,
          completed_at = ${isTerminal ? 'CURRENT_TIMESTAMP' : 'completed_at'},
          error_message = :errorMessage
      WHERE id = :id
    `;
    await db.execute(sql, {
      id,
      status,
      progressPercent,
      errorMessage: errorMessage || null,
    });
  }

  async createEvent(event: SearchEvent): Promise<void> {
    const sql = `
      INSERT INTO SEARCH_EVENTS (id, search_id, stage, progress, message)
      VALUES (:id, :searchId, :stage, :progress, :message)
    `;
    await db.execute(sql, {
      id: event.id,
      searchId: event.searchId,
      stage: event.stage,
      progress: event.progress,
      message: event.message,
    });
  }

  async findEventsBySearchId(searchId: string): Promise<SearchEvent[]> {
    const sql = `
      SELECT id, search_id, stage, progress, message, created_at
      FROM SEARCH_EVENTS
      WHERE search_id = :searchId
      ORDER BY created_at ASC
    `;
    const result = await db.execute<SearchEventRow>(sql, { searchId });
    return (result.rows || []).map((row: SearchEventRow) => ({
      id: row.ID,
      searchId: row.SEARCH_ID,
      stage: row.STAGE as SearchStage,
      progress: Number(row.PROGRESS),
      message: row.MESSAGE,
      createdAt: new Date(row.CREATED_AT),
    }));
  }

  async createObjectTrack(track: {
    id: string;
    searchId: string;
    trackId: number;
    className: string;
    confidence: number;
    frameIndex: number;
    timestampMs: number;
    bboxX: number;
    bboxY: number;
    bboxWidth: number;
    bboxHeight: number;
    status?: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO OBJECT_TRACKS (
        id, search_id, track_id, class_name, confidence,
        frame_index, timestamp_ms, bbox_x, bbox_y, bbox_width, bbox_height, status
      ) VALUES (
        :id, :searchId, :trackId, :className, :confidence,
        :frameIndex, :timestampMs, :bboxX, :bboxY, :bboxWidth, :bboxHeight, :status
      )
    `;
    await db.execute(sql, {
      id: track.id,
      searchId: track.searchId,
      trackId: track.trackId,
      className: track.className,
      confidence: track.confidence,
      frameIndex: track.frameIndex,
      timestampMs: track.timestampMs,
      bboxX: track.bboxX,
      bboxY: track.bboxY,
      bboxWidth: track.bboxWidth,
      bboxHeight: track.bboxHeight,
      status: track.status || 'ACTIVE',
    });
  }

  async findTracksBySearchId(searchId: string): Promise<any[]> {
    const sql = `
      SELECT id, search_id, track_id, class_name, confidence, frame_index, timestamp_ms, bbox_x, bbox_y, bbox_width, bbox_height, status, created_at
      FROM OBJECT_TRACKS
      WHERE search_id = :searchId
      ORDER BY timestamp_ms DESC, frame_index DESC, track_id ASC
    `;
    const result = await db.execute<any>(sql, { searchId });
    if (!result.rows) return [];
    return result.rows.map((r: any) => ({
      id: r.ID || r.id,
      searchId: r.SEARCH_ID || r.searchId,
      trackId: Number(r.TRACK_ID ?? r.trackId),
      className: r.CLASS_NAME || r.className,
      confidence: Number(r.CONFIDENCE ?? r.confidence),
      frameIndex: Number(r.FRAME_INDEX ?? r.frameIndex ?? 0),
      timestampMs: Number(r.TIMESTAMP_MS ?? r.timestampMs ?? 0),
      bboxX: Number(r.BBOX_X ?? r.bboxX ?? 0),
      bboxY: Number(r.BBOX_Y ?? r.bboxY ?? 0),
      bboxWidth: Number(r.BBOX_WIDTH ?? r.bboxWidth ?? 0),
      bboxHeight: Number(r.BBOX_HEIGHT ?? r.bboxHeight ?? 0),
      status: r.STATUS || r.status,
      createdAt: r.CREATED_AT || r.createdAt,
    }));
  }

  async createSearchResult(resultData: {
    id: string;
    searchId: string;
    targetName: string;
    targetFound: number;
    finalConfidence: number;
    detectionId?: string | null;
    matchedTrackId?: number | null;
    summaryNotes?: string | null;
    lastSeenTimestamp?: string | number | null;
    lastSeenFrame?: number | null;
    lastSeenBbox?: string | null;
    lastSeenConfidence?: number | null;
    lastSeenColor?: string | null;
    lastSeenEvidencePath?: string | null;
  }): Promise<void> {
    const summaryData = {
      notes: resultData.summaryNotes || `Target acquired with ${resultData.finalConfidence}% confidence`,
      lastSeen: {
        timestamp: resultData.lastSeenTimestamp,
        frame: resultData.lastSeenFrame,
        bbox: resultData.lastSeenBbox ? (typeof resultData.lastSeenBbox === 'string' ? JSON.parse(resultData.lastSeenBbox) : resultData.lastSeenBbox) : null,
        confidence: resultData.lastSeenConfidence ?? resultData.finalConfidence,
        color: resultData.lastSeenColor,
        evidencePath: resultData.lastSeenEvidencePath,
      },
    };
    const summaryNotesString = JSON.stringify(summaryData);
    const sql = `
      INSERT INTO SEARCH_RESULTS (
        id, search_id, target_name, target_found, final_confidence,
        detection_id, matched_track_id, summary_notes
      ) VALUES (
        :id, :searchId, :targetName, :targetFound, :finalConfidence,
        :detectionId, :matchedTrackId, :summaryNotes
      )
    `;
    await db.execute(sql, {
      id: resultData.id,
      searchId: resultData.searchId,
      targetName: resultData.targetName,
      targetFound: resultData.targetFound,
      finalConfidence: resultData.finalConfidence,
      detectionId: resultData.detectionId || null,
      matchedTrackId: resultData.matchedTrackId || null,
      summaryNotes: summaryNotesString,
    });
  }

  async findResultBySearchId(searchId: string): Promise<any | null> {
    const sql = `
      SELECT id, search_id, target_name, target_found, final_confidence, detection_id, matched_track_id, summary_notes, created_at
      FROM SEARCH_RESULTS
      WHERE search_id = :searchId
    `;
    const result = await db.execute<any>(sql, { searchId });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    const r = result.rows[0];
    const finalConf = r.FINAL_CONFIDENCE !== undefined ? r.FINAL_CONFIDENCE : r.finalConfidence;
    let parsedLastSeen: any = null;
    let cleanNotes = r.SUMMARY_NOTES || r.summary_notes || r.summaryNotes || '';
    try {
      if (r.SUMMARY_NOTES && (r.SUMMARY_NOTES.startsWith('{') || r.SUMMARY_NOTES.includes('"lastSeen"'))) {
        const parsed = JSON.parse(r.SUMMARY_NOTES);
        parsedLastSeen = parsed.lastSeen;
        cleanNotes = parsed.notes || cleanNotes;
      }
    } catch {}

    return {
      id: r.ID || r.id,
      ID: r.ID || r.id,
      searchId: r.SEARCH_ID || r.searchId,
      SEARCH_ID: r.SEARCH_ID || r.searchId,
      targetName: r.TARGET_NAME || r.targetName,
      TARGET_NAME: r.TARGET_NAME || r.targetName,
      targetFound: r.TARGET_FOUND !== undefined ? r.TARGET_FOUND : r.targetFound,
      TARGET_FOUND: r.TARGET_FOUND !== undefined ? r.TARGET_FOUND : r.targetFound,
      finalConfidence: finalConf,
      FINAL_CONFIDENCE: finalConf,
      final_confidence: finalConf,
      detectionId: r.DETECTION_ID || r.detectionId,
      DETECTION_ID: r.DETECTION_ID || r.detectionId,
      matchedTrackId: r.MATCHED_TRACK_ID !== undefined ? r.MATCHED_TRACK_ID : r.matchedTrackId,
      MATCHED_TRACK_ID: r.MATCHED_TRACK_ID !== undefined ? r.MATCHED_TRACK_ID : r.matchedTrackId,
      summaryNotes: cleanNotes,
      SUMMARY_NOTES: cleanNotes,
      lastSeenTimestamp: r.LAST_SEEN_TIMESTAMP || parsedLastSeen?.timestamp || null,
      lastSeenFrame: r.LAST_SEEN_FRAME ?? parsedLastSeen?.frame ?? null,
      lastSeenBbox: r.LAST_SEEN_BBOX || parsedLastSeen?.bbox || null,
      lastSeenConfidence: r.LAST_SEEN_CONFIDENCE ?? parsedLastSeen?.confidence ?? null,
      lastSeenColor: r.LAST_SEEN_COLOR || parsedLastSeen?.color || null,
      lastSeenEvidencePath: r.LAST_SEEN_EVIDENCE_PATH || parsedLastSeen?.evidencePath || null,
      createdAt: r.CREATED_AT ? new Date(r.CREATED_AT) : new Date(),
    };
  }

  async createSearchTarget(target: {
    id: string;
    searchId: string;
    targetText: string;
    targetClass?: string | null;
    targetColor?: string | null;
    normalizedTarget: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO SEARCH_TARGETS (id, search_id, target_text, target_class, target_color, normalized_target)
      VALUES (:id, :searchId, :targetText, :targetClass, :targetColor, :normalizedTarget)
    `;
    await db.execute(sql, {
      id: target.id,
      searchId: target.searchId,
      targetText: target.targetText,
      targetClass: target.targetClass || null,
      targetColor: target.targetColor || null,
      normalizedTarget: target.normalizedTarget,
    });
  }

  async findTargetBySearchId(searchId: string): Promise<any | null> {
    const sql = `
      SELECT id, search_id, target_text, target_class, target_color, normalized_target, created_at
      FROM SEARCH_TARGETS
      WHERE search_id = :searchId
    `;
    const result = await db.execute<any>(sql, { searchId });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    const r = result.rows[0];
    return {
      id: r.ID || r.id,
      searchId: r.SEARCH_ID || r.searchId,
      targetText: r.TARGET_TEXT !== undefined ? r.TARGET_TEXT : r.targetText,
      targetClass: r.TARGET_CLASS !== undefined ? r.TARGET_CLASS : r.targetClass,
      targetColor: r.TARGET_COLOR !== undefined ? r.TARGET_COLOR : r.targetColor,
      normalizedTarget: r.NORMALIZED_TARGET !== undefined ? r.NORMALIZED_TARGET : r.normalizedTarget,
      createdAt: r.CREATED_AT ? new Date(r.CREATED_AT) : (r.createdAt ? new Date(r.createdAt) : new Date()),
    };
  }
}

export const searchRepository = new SearchRepository();
