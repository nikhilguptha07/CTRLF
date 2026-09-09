import { db } from '../config/database';
import { EvidenceRecord, CreateEvidenceInput } from '../types/evidence';

interface EvidenceRow {
  ID: string;
  SESSION_ID: string;
  DETECTION_ID?: string | null;
  TRACK_ID?: number | null;
  VIDEO_ID?: string | null;
  FRAME_NUMBER: number;
  TIMESTAMP_MS: number;
  ORIGINAL_IMAGE_PATH: string;
  ANNOTATED_IMAGE_PATH?: string | null;
  SELECTION_POLICY: string;
  CONFIDENCE?: number | null;
  CREATED_AT: Date | string;
}

export class EvidenceRepository {
  private mapRowToEvidence(row: EvidenceRow): EvidenceRecord {
    return {
      id: row.ID,
      sessionId: row.SESSION_ID,
      detectionId: row.DETECTION_ID || null,
      trackId: row.TRACK_ID != null ? Number(row.TRACK_ID) : null,
      videoId: row.VIDEO_ID || null,
      frameNumber: Number(row.FRAME_NUMBER),
      timestampMs: Number(row.TIMESTAMP_MS),
      originalImagePath: row.ORIGINAL_IMAGE_PATH,
      annotatedImagePath: row.ANNOTATED_IMAGE_PATH || null,
      selectionPolicy: row.SELECTION_POLICY || 'highest_confidence',
      confidence: row.CONFIDENCE != null ? Number(row.CONFIDENCE) : null,
      createdAt: new Date(row.CREATED_AT),
    };
  }

  async create(evidence: CreateEvidenceInput): Promise<EvidenceRecord> {
    const sql = `
      INSERT INTO EVIDENCE_FILES (
        id, session_id, detection_id, track_id, video_id,
        frame_number, timestamp_ms, original_image_path, annotated_image_path,
        selection_policy, confidence
      )
      VALUES (
        :id, :sessionId, :detectionId, :trackId, :videoId,
        :frameNumber, :timestampMs, :originalImagePath, :annotatedImagePath,
        :selectionPolicy, :confidence
      )
    `;

    const binds = {
      id: evidence.id,
      sessionId: evidence.sessionId,
      detectionId: evidence.detectionId || null,
      trackId: evidence.trackId != null ? evidence.trackId : null,
      videoId: evidence.videoId || null,
      frameNumber: evidence.frameNumber,
      timestampMs: evidence.timestampMs,
      originalImagePath: evidence.originalImagePath,
      annotatedImagePath: evidence.annotatedImagePath || null,
      selectionPolicy: evidence.selectionPolicy || 'highest_confidence',
      confidence: evidence.confidence != null ? evidence.confidence : null,
    };

    await db.execute(sql, binds);

    return {
      ...evidence,
      createdAt: new Date(),
    };
  }

  async findBySessionId(sessionId: string): Promise<EvidenceRecord[]> {
    const sql = `
      SELECT id, session_id, detection_id, track_id, video_id,
             frame_number, timestamp_ms, original_image_path, annotated_image_path,
             selection_policy, confidence, created_at
      FROM EVIDENCE_FILES
      WHERE session_id = :sessionId
      ORDER BY frame_number ASC
    `;

    const result = await db.execute<EvidenceRow>(sql, { sessionId });
    return (result.rows || []).map((row) => this.mapRowToEvidence(row));
  }

  async findById(id: string): Promise<EvidenceRecord | null> {
    const sql = `
      SELECT id, session_id, detection_id, track_id, video_id,
             frame_number, timestamp_ms, original_image_path, annotated_image_path,
             selection_policy, confidence, created_at
      FROM EVIDENCE_FILES
      WHERE id = :id
    `;

    const result = await db.execute<EvidenceRow>(sql, { id });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEvidence(result.rows[0]);
  }
}

export const evidenceRepository = new EvidenceRepository();
