import { db } from '../config/database';
import { DetectionResult, BoundingBox } from '../types/detection';

interface DetectionRow {
  ID: string;
  SEARCH_ID: string;
  FOUND: number;
  CONFIDENCE: number;
  DETECTED_LABEL: string;
  DOMINANT_COLOR?: string | null;
  COLOR_CONFIDENCE?: number | null;
  SECONDARY_COLORS_JSON?: string | null;
  FRAME_TIMESTAMP_MS?: number | null;
  EVIDENCE_FRAME_PATH?: string | null;
  BOUNDING_BOX_JSON?: string | null;
  TRACK_ID?: number | null;
  CREATED_AT: Date | string;
}

export class DetectionRepository {
  private mapRowToResult(row: DetectionRow): DetectionResult {
    let boundingBox: BoundingBox | null = null;
    if (row.BOUNDING_BOX_JSON) {
      try {
        boundingBox = JSON.parse(row.BOUNDING_BOX_JSON);
      } catch {
        boundingBox = null;
      }
    }

    let secondaryColors: string[] | null = null;
    if (row.SECONDARY_COLORS_JSON) {
      try {
        secondaryColors = JSON.parse(row.SECONDARY_COLORS_JSON);
      } catch {
        secondaryColors = null;
      }
    }

    return {
      id: row.ID,
      searchId: row.SEARCH_ID,
      found: Number(row.FOUND) === 1,
      confidence: Number(row.CONFIDENCE),
      detectedLabel: row.DETECTED_LABEL,
      dominantColor: row.DOMINANT_COLOR || null,
      colorConfidence: row.COLOR_CONFIDENCE !== null && row.COLOR_CONFIDENCE !== undefined ? Number(row.COLOR_CONFIDENCE) : null,
      secondaryColors,
      frameTimestampMs: row.FRAME_TIMESTAMP_MS !== null && row.FRAME_TIMESTAMP_MS !== undefined ? Number(row.FRAME_TIMESTAMP_MS) : null,
      evidenceFramePath: row.EVIDENCE_FRAME_PATH || null,
      boundingBox,
      trackId: row.TRACK_ID != null ? Number(row.TRACK_ID) : null,
      createdAt: new Date(row.CREATED_AT),
    };
  }

  async findBySearchId(searchId: string): Promise<DetectionResult | null> {
    const sql = `
      SELECT id, search_id, found, confidence, detected_label, dominant_color, color_confidence, secondary_colors_json, frame_timestamp_ms, evidence_frame_path, bounding_box_json, track_id, created_at
      FROM DETECTION_RESULTS
      WHERE search_id = :searchId
    `;
    const result = await db.execute<DetectionRow>(sql, { searchId });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToResult(result.rows[0]);
  }

  async findById(id: string): Promise<DetectionResult | null> {
    const sql = `
      SELECT id, search_id, found, confidence, detected_label, dominant_color, color_confidence, secondary_colors_json, frame_timestamp_ms, evidence_frame_path, bounding_box_json, track_id, created_at
      FROM DETECTION_RESULTS
      WHERE id = :id
    `;
    const result = await db.execute<DetectionRow>(sql, { id });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRowToResult(result.rows[0]);
  }

  async create(detection: Omit<DetectionResult, 'createdAt'>): Promise<DetectionResult> {
    const sql = `
      INSERT INTO DETECTION_RESULTS (id, search_id, found, confidence, detected_label, dominant_color, color_confidence, secondary_colors_json, frame_timestamp_ms, evidence_frame_path, bounding_box_json, track_id)
      VALUES (:id, :searchId, :found, :confidence, :detectedLabel, :dominantColor, :colorConfidence, :secondaryColorsJson, :frameTimestampMs, :evidenceFramePath, :boundingBoxJson, :trackId)
    `;
    await db.execute(sql, {
      id: detection.id,
      searchId: detection.searchId,
      found: detection.found ? 1 : 0,
      confidence: detection.confidence,
      detectedLabel: detection.detectedLabel,
      dominantColor: detection.dominantColor || null,
      colorConfidence: detection.colorConfidence != null ? detection.colorConfidence : null,
      secondaryColorsJson: detection.secondaryColors ? JSON.stringify(detection.secondaryColors) : null,
      frameTimestampMs: detection.frameTimestampMs || null,
      evidenceFramePath: detection.evidenceFramePath || null,
      boundingBoxJson: detection.boundingBox ? JSON.stringify(detection.boundingBox) : null,
      trackId: detection.trackId != null ? Number(detection.trackId) : null,
    });

    const created = await this.findBySearchId(detection.searchId);
    if (created) {
      return created;
    }
    return {
      id: detection.id,
      searchId: detection.searchId,
      found: detection.found,
      confidence: detection.confidence,
      detectedLabel: detection.detectedLabel,
      dominantColor: detection.dominantColor || null,
      colorConfidence: detection.colorConfidence != null ? detection.colorConfidence : null,
      secondaryColors: detection.secondaryColors || null,
      frameTimestampMs: detection.frameTimestampMs || null,
      evidenceFramePath: detection.evidenceFramePath || null,
      boundingBox: detection.boundingBox || null,
      trackId: detection.trackId != null ? Number(detection.trackId) : null,
      createdAt: new Date(),
    };
  }

  /**
   * Save an exact captured detection frame directly into Oracle 21c XE DETECTIONS table with BLOB image
   */
  async saveDetection(input: import('../types/detection').CreateDetectionInput): Promise<import('../types/detection').OracleDetectionRecord> {
    let imageBuffer: Buffer | null = null;
    if (Buffer.isBuffer(input.image)) {
      imageBuffer = input.image;
    } else if (typeof input.image === 'string' && input.image.length > 0) {
      const base64Clean = input.image.replace(/^data:image\/\w+;base64,/, '');
      try {
        imageBuffer = Buffer.from(base64Clean, 'base64');
      } catch {
        imageBuffer = null;
      }
    }

    const userId = input.userId || 1;
    const searchId = input.searchId || 1;
    const cameraId = input.cameraId || 1;
    const objectName = input.objectName || 'Target Object';
    const confidence = Number(input.confidence || 0);
    const timestampSeconds = Number(input.timestampSeconds || 0);
    const videoTimestamp = input.videoTimestamp || `${Math.floor(timestampSeconds / 60).toString().padStart(2, '0')}:${Math.floor(timestampSeconds % 60).toString().padStart(2, '0')}`;
    const frameNumber = Math.round(input.frameNumber || 0);
    const box = input.boundingBox || { x: 0, y: 0, width: 0, height: 0 };
    const detectionStatus = input.detectionStatus || 'TARGET_ACQUIRED';

    const sql = `
      INSERT INTO DETECTIONS (
        USER_ID, SEARCH_ID, CAMERA_ID, OBJECT_NAME, CONFIDENCE,
        TIMESTAMP_SECONDS, VIDEO_TIMESTAMP, FRAME_NUMBER,
        BOUNDING_BOX_X, BOUNDING_BOX_Y, BOUNDING_BOX_WIDTH, BOUNDING_BOX_HEIGHT,
        DETECTION_STATUS, DETECTION_IMAGE
      )
      VALUES (
        :userId, :searchId, :cameraId, :objectName, :confidence,
        :timestampSeconds, :videoTimestamp, :frameNumber,
        :boundingBoxX, :boundingBoxY, :boundingBoxWidth, :boundingBoxHeight,
        :detectionStatus, :detectionImage
      )
    `;

    const binds: Record<string, unknown> = {
      userId,
      searchId,
      cameraId,
      objectName,
      confidence,
      timestampSeconds,
      videoTimestamp,
      frameNumber,
      boundingBoxX: box.x,
      boundingBoxY: box.y,
      boundingBoxWidth: box.width,
      boundingBoxHeight: box.height,
      detectionStatus,
      detectionImage: imageBuffer,
    };

    const insertResult = await db.execute(sql, binds);

    // Retrieve by searchId or latest detection
    const latestSql = `
      SELECT DETECTION_ID, USER_ID, SEARCH_ID, CAMERA_ID, OBJECT_NAME, CONFIDENCE,
             TIMESTAMP_SECONDS, VIDEO_TIMESTAMP, FRAME_NUMBER,
             BOUNDING_BOX_X, BOUNDING_BOX_Y, BOUNDING_BOX_WIDTH, BOUNDING_BOX_HEIGHT,
             DETECTION_STATUS, CREATED_AT,
             CASE WHEN DETECTION_IMAGE IS NOT NULL THEN 1 ELSE 0 END AS HAS_IMAGE
      FROM DETECTIONS
      WHERE SEARCH_ID = :searchId
      ORDER BY CREATED_AT DESC
    `;
    const res = await db.execute<any>(latestSql, { searchId });
    if (res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      return {
        detectionId: row.DETECTION_ID || row.ID || 1,
        userId: row.USER_ID,
        searchId: row.SEARCH_ID,
        cameraId: row.CAMERA_ID,
        objectName: row.OBJECT_NAME,
        confidence: Number(row.CONFIDENCE),
        timestampSeconds: Number(row.TIMESTAMP_SECONDS),
        videoTimestamp: row.VIDEO_TIMESTAMP,
        frameNumber: Number(row.FRAME_NUMBER),
        boundingBox: {
          x: Number(row.BOUNDING_BOX_X),
          y: Number(row.BOUNDING_BOX_Y),
          width: Number(row.BOUNDING_BOX_WIDTH),
          height: Number(row.BOUNDING_BOX_HEIGHT),
        },
        detectionStatus: row.DETECTION_STATUS,
        hasImage: Boolean(row.HAS_IMAGE),
        createdAt: new Date(row.CREATED_AT),
      };
    }

    return {
      detectionId: 1,
      userId,
      searchId,
      cameraId,
      objectName,
      confidence,
      timestampSeconds,
      videoTimestamp,
      frameNumber,
      boundingBox: box,
      detectionStatus,
      hasImage: Boolean(imageBuffer),
      createdAt: new Date(),
    };
  }

  /**
   * Retrieve detection metadata by detection ID
   */
  async findDetectionById(detectionId: string | number): Promise<import('../types/detection').OracleDetectionRecord | null> {
    const sql = `
      SELECT DETECTION_ID, USER_ID, SEARCH_ID, CAMERA_ID, OBJECT_NAME, CONFIDENCE,
             TIMESTAMP_SECONDS, VIDEO_TIMESTAMP, FRAME_NUMBER,
             BOUNDING_BOX_X, BOUNDING_BOX_Y, BOUNDING_BOX_WIDTH, BOUNDING_BOX_HEIGHT,
             DETECTION_STATUS, CREATED_AT,
             CASE WHEN DETECTION_IMAGE IS NOT NULL THEN 1 ELSE 0 END AS HAS_IMAGE
      FROM DETECTIONS
      WHERE DETECTION_ID = :detectionId
    `;
    const result = await db.execute<any>(sql, { detectionId });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      detectionId: row.DETECTION_ID || row.ID || detectionId,
      userId: row.USER_ID,
      searchId: row.SEARCH_ID,
      cameraId: row.CAMERA_ID,
      objectName: row.OBJECT_NAME,
      confidence: Number(row.CONFIDENCE),
      timestampSeconds: Number(row.TIMESTAMP_SECONDS),
      videoTimestamp: row.VIDEO_TIMESTAMP,
      frameNumber: Number(row.FRAME_NUMBER),
      boundingBox: {
        x: Number(row.BOUNDING_BOX_X),
        y: Number(row.BOUNDING_BOX_Y),
        width: Number(row.BOUNDING_BOX_WIDTH),
        height: Number(row.BOUNDING_BOX_HEIGHT),
      },
      detectionStatus: row.DETECTION_STATUS,
      hasImage: Boolean(row.HAS_IMAGE),
      createdAt: new Date(row.CREATED_AT),
    };
  }

  /**
   * Stream the exact stored frame binary from the Oracle BLOB column
   */
  async getDetectionImage(detectionId: string | number): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const sql = `
      SELECT DETECTION_IMAGE
      FROM DETECTIONS
      WHERE DETECTION_ID = :detectionId
    `;
    const result = await db.execute<any>(sql, { detectionId });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    const rawLob = result.rows[0].DETECTION_IMAGE;
    if (!rawLob) {
      return null;
    }

    let buffer: Buffer | null = null;
    if (Buffer.isBuffer(rawLob)) {
      buffer = rawLob;
    } else if (typeof rawLob === 'string') {
      buffer = Buffer.from(rawLob, 'base64');
    } else if (rawLob && typeof rawLob.on === 'function') {
      // Oracle Lob Stream
      buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        rawLob.on('data', (chunk: Buffer) => chunks.push(chunk));
        rawLob.on('end', () => resolve(Buffer.concat(chunks)));
        rawLob.on('error', reject);
      });
    }

    if (!buffer || buffer.length === 0) {
      return null;
    }

    // Determine MIME type from magic bytes
    let mimeType = 'image/jpeg';
    if (buffer.length > 4) {
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        mimeType = 'image/png';
      } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        mimeType = 'image/webp';
      }
    }

    return { buffer, mimeType };
  }

  /**
   * Get all detections for a given search session
   */
  async findDetectionsBySearchId(searchId: string | number): Promise<import('../types/detection').OracleDetectionRecord[]> {
    const sql = `
      SELECT DETECTION_ID, USER_ID, SEARCH_ID, CAMERA_ID, OBJECT_NAME, CONFIDENCE,
             TIMESTAMP_SECONDS, VIDEO_TIMESTAMP, FRAME_NUMBER,
             BOUNDING_BOX_X, BOUNDING_BOX_Y, BOUNDING_BOX_WIDTH, BOUNDING_BOX_HEIGHT,
             DETECTION_STATUS, CREATED_AT,
             CASE WHEN DETECTION_IMAGE IS NOT NULL THEN 1 ELSE 0 END AS HAS_IMAGE
      FROM DETECTIONS
      WHERE SEARCH_ID = :searchId
      ORDER BY FRAME_NUMBER ASC
    `;
    const result = await db.execute<any>(sql, { searchId });
    if (!result.rows) {
      return [];
    }
    return result.rows.map((row) => ({
      detectionId: row.DETECTION_ID || row.ID,
      userId: row.USER_ID,
      searchId: row.SEARCH_ID,
      cameraId: row.CAMERA_ID,
      objectName: row.OBJECT_NAME,
      confidence: Number(row.CONFIDENCE),
      timestampSeconds: Number(row.TIMESTAMP_SECONDS),
      videoTimestamp: row.VIDEO_TIMESTAMP,
      frameNumber: Number(row.FRAME_NUMBER),
      boundingBox: {
        x: Number(row.BOUNDING_BOX_X),
        y: Number(row.BOUNDING_BOX_Y),
        width: Number(row.BOUNDING_BOX_WIDTH),
        height: Number(row.BOUNDING_BOX_HEIGHT),
      },
      detectionStatus: row.DETECTION_STATUS,
      hasImage: Boolean(row.HAS_IMAGE),
      createdAt: new Date(row.CREATED_AT),
    }));
  }
}

export const detectionRepository = new DetectionRepository();
