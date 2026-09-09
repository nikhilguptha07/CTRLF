/**
 * ============================================================================
 * CONTROL F — AI Object Detection & Recovery System
 * Production node-oracledb TypeScript Reference Implementations
 * Database: Oracle Database 21c XE
 * ============================================================================
 * 
 * Demonstrates:
 * 1. Connection pooling (Thin Mode, zero Oracle Client C binary dependencies)
 * 2. SELECT with bind parameters and outFormat OBJECT
 * 3. INSERT ... RETURNING with OUT bind variables
 * 4. UPDATE with bind parameters and rowsAffected inspection
 * 5. Full ACID Transactions with automatic Commit and Rollback
 * 6. Offset / Fetch Next Pagination (ANSI SQL / Oracle 12c+ standard)
 * 7. Batch operations with executeMany and bindDefs
 */

import oracledb, {
  type Pool,
  type Connection,
  type Result,
} from 'oracledb';

// Global defaults configuration
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false; // Never auto-commit globally; maintain explicit transaction boundaries

// ============================================================================
// 1. Connection Pool Initialization & Graceful Teardown
// ============================================================================
let pool: Pool | null = null;

export async function initializeOraclePool(): Promise<Pool> {
  if (pool) return pool;

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER || 'CONTROLF_APP',
    password: process.env.ORACLE_PASSWORD || 'ControlF_Strong_Pass_2026#',
    connectString: `${process.env.ORACLE_HOST || 'localhost'}:${process.env.ORACLE_PORT || 1521}/${process.env.ORACLE_SERVICE_NAME || 'XEPDB1'}`,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 2,
    poolTimeout: 60,
  });

  return pool;
}

export async function closeOraclePool(): Promise<void> {
  if (pool) {
    await pool.close(10); // Wait up to 10 seconds for in-flight requests
    pool = null;
  }
}

// ============================================================================
// 2. Parametrized SELECT Query (Zero String Concatenation)
// ============================================================================
export interface SearchSessionRow {
  SEARCH_ID: number;
  USER_ID: number;
  QUERY_ID: number;
  SOURCE_TYPE: 'VIDEO' | 'CAMERA';
  STATUS: string;
  PROGRESS_PERCENT: number;
  STARTED_AT: Date;
  COMPLETED_AT?: Date | null;
}

export async function getSearchSessionById(
  searchId: number,
  userId: number
): Promise<SearchSessionRow | null> {
  const p = await initializeOraclePool();
  let conn: Connection | null = null;

  try {
    conn = await p.getConnection();

    const sql = `
      SELECT 
        search_id,
        user_id,
        query_id,
        source_type,
        status,
        progress_percent,
        started_at,
        completed_at
      FROM SEARCH_SESSIONS
      WHERE search_id = :searchId
        AND user_id   = :userId
    `;

    // Bind parameters mapped securely by name
    const result: Result<SearchSessionRow> = await conn.execute<SearchSessionRow>(
      sql,
      {
        searchId: { val: searchId, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        userId:   { val: userId,   dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } finally {
    if (conn) {
      await conn.close(); // Release back to connection pool
    }
  }
}

// ============================================================================
// 3. INSERT ... RETURNING with OUT Bind Variables
// ============================================================================
export interface NewObjectQueryInput {
  userId: number;
  objectName: string;
  objectDescription?: string;
}

export async function insertObjectQuery(
  input: NewObjectQueryInput
): Promise<{ queryId: number; createdAt: Date }> {
  const p = await initializeOraclePool();
  let conn: Connection | null = null;

  try {
    conn = await p.getConnection();

    const sql = `
      INSERT INTO OBJECT_QUERIES (
        user_id,
        object_name,
        object_description
      ) VALUES (
        :userId,
        :objectName,
        :objectDescription
      )
      RETURNING query_id, created_at INTO :outQueryId, :outCreatedAt
    `;

    const binds = {
      userId:            { val: input.userId, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      objectName:        { val: input.objectName, dir: oracledb.BIND_IN, type: oracledb.STRING },
      objectDescription: { val: input.objectDescription || null, dir: oracledb.BIND_IN, type: oracledb.STRING },
      // OUT bind definitions
      outQueryId:        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      outCreatedAt:      { dir: oracledb.BIND_OUT, type: oracledb.DATE },
    };

    const result = await conn.execute<{
      outQueryId: [number];
      outCreatedAt: [Date];
    }>(sql, binds, { autoCommit: true });

    const outBinds = result.outBinds;
    if (!outBinds || !outBinds.outQueryId || outBinds.outQueryId.length === 0) {
      throw new Error('Failed to retrieve auto-generated IDENTITY from Oracle');
    }

    return {
      queryId: outBinds.outQueryId[0],
      createdAt: outBinds.outCreatedAt[0],
    };
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

// ============================================================================
// 4. Parametrized UPDATE with rowsAffected Inspection
// ============================================================================
export async function updateCameraHealthStatus(
  cameraId: number,
  userId: number,
  newStatus: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DISABLED'
): Promise<boolean> {
  const p = await initializeOraclePool();
  let conn: Connection | null = null;

  try {
    conn = await p.getConnection();

    const sql = `
      UPDATE CAMERAS
      SET status            = :newStatus,
          last_connected_at = SYSTIMESTAMP
      WHERE camera_id       = :cameraId
        AND user_id         = :userId
    `;

    const result = await conn.execute(
      sql,
      {
        newStatus: { val: newStatus, dir: oracledb.BIND_IN, type: oracledb.STRING },
        cameraId:  { val: cameraId,  dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        userId:    { val: userId,    dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    return (result.rowsAffected ?? 0) > 0;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

// ============================================================================
// 5. ACID Multi-Table Transaction with Rollback Guarantee
// ============================================================================
export interface CompleteDetectionTransactionInput {
  searchId: number;
  userId: number;
  objectName: string;
  confidenceScore: number;
  frameNumber: number;
  frameTimestampMs: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  evidenceImagePath: string;
}

export async function persistDetectionTransaction(
  input: CompleteDetectionTransactionInput
): Promise<{ detectionId: number }> {
  const p = await initializeOraclePool();
  let conn: Connection | null = null;

  try {
    conn = await p.getConnection();

    // 1. Insert Detection Result
    const detectionSql = `
      INSERT INTO DETECTION_RESULTS (
        search_id,
        object_name,
        confidence_score,
        frame_number,
        frame_timestamp_ms,
        bounding_box_x,
        bounding_box_y,
        bounding_box_width,
        bounding_box_height,
        image_path,
        verified
      ) VALUES (
        :searchId,
        :objectName,
        :confidenceScore,
        :frameNumber,
        :frameTimestampMs,
        :boxX,
        :boxY,
        :boxW,
        :boxH,
        :imagePath,
        1
      )
      RETURNING detection_id INTO :outDetectionId
    `;

    const detResult = await conn.execute<{ outDetectionId: [number] }>(
      detectionSql,
      {
        searchId:         input.searchId,
        objectName:       input.objectName,
        confidenceScore:  input.confidenceScore,
        frameNumber:      input.frameNumber,
        frameTimestampMs: input.frameTimestampMs,
        boxX:             input.boxX,
        boxY:             input.boxY,
        boxW:             input.boxW,
        boxH:             input.boxH,
        imagePath:        input.evidenceImagePath,
        outDetectionId:   { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );

    const detectionId = detResult.outBinds!.outDetectionId[0];

    // 2. Conclude Search Session Status to DETECTED
    const sessionSql = `
      UPDATE SEARCH_SESSIONS
      SET status           = 'DETECTED',
          progress_percent = 100,
          completed_at     = SYSTIMESTAMP
      WHERE search_id      = :searchId
    `;
    await conn.execute(sessionSql, { searchId: input.searchId });

    // 3. Log Milestone Event
    const eventSql = `
      INSERT INTO SEARCH_EVENTS (
        search_id,
        event_type,
        message,
        progress_percent
      ) VALUES (
        :searchId,
        'DETECTED',
        'Object recovered with verified confidence: ' || :score,
        100
      )
    `;
    await conn.execute(eventSql, {
      searchId: input.searchId,
      score: input.confidenceScore.toFixed(4),
    });

    // 4. Create Forensic Audit Record
    const auditSql = `
      INSERT INTO AUDIT_LOGS (
        user_id,
        action,
        entity_type,
        entity_id,
        details
      ) VALUES (
        :userId,
        'DETECTION_VERIFIED',
        'DETECTION_RESULT',
        :entityId,
        JSON_OBJECT(
          'searchId' VALUE :searchId,
          'confidence' VALUE :score,
          'detectionId' VALUE :detectionId
        )
      )
    `;
    await conn.execute(auditSql, {
      userId: input.userId,
      entityId: String(detectionId),
      searchId: input.searchId,
      score: input.confidenceScore,
      detectionId,
    });

    // Explicitly Commit All 4 operations atomically
    await conn.commit();
    return { detectionId };
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback(); // Complete atomic rollback on failure
      } catch (rollbackErr) {
        // Log rollback error
      }
    }
    throw error;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

// ============================================================================
// 6. Pagination with OFFSET / FETCH NEXT (ANSI SQL standard in Oracle 12c+)
// ============================================================================
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalRecords: number;
}

export async function getPaginatedSearchHistory(
  userId: number,
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<Record<string, unknown>>> {
  const p = await initializeOraclePool();
  let conn: Connection | null = null;

  try {
    conn = await p.getConnection();

    const offset = (page - 1) * pageSize;

    // 1. Total Count Query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM V_USER_SEARCH_HISTORY
      WHERE user_id = :userId
    `;
    const countResult = await conn.execute<{ TOTAL: number }>(countSql, { userId });
    const totalRecords = countResult.rows?.[0]?.TOTAL ?? 0;

    // 2. Paginated Data Query using OFFSET and FETCH FIRST
    const dataSql = `
      SELECT 
        search_id,
        object_name,
        object_description,
        source_type,
        source_name,
        status,
        progress_percent,
        started_at,
        completed_at,
        duration_seconds,
        detection_count
      FROM V_USER_SEARCH_HISTORY
      WHERE user_id = :userId
      ORDER BY created_at DESC
      OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY
    `;

    const result = await conn.execute<Record<string, unknown>>(
      dataSql,
      {
        userId:   { val: userId,   dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        offset:   { val: offset,   dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        pageSize: { val: pageSize, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      data: result.rows || [],
      page,
      pageSize,
      totalRecords,
    };
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

// ============================================================================
// 7. Bulk Insertion using executeMany with bindDefs
// ============================================================================
export interface FrameExtractionBatchItem {
  searchId: number;
  frameNumber: number;
  frameTimestampMs: number;
  imagePath: string;
}

export async function batchInsertExtractedFrames(
  frames: FrameExtractionBatchItem[]
): Promise<number> {
  if (frames.length === 0) return 0;

  const p = await initializeOraclePool();
  let conn: Connection | null = null;

  try {
    conn = await p.getConnection();

    const sql = `
      INSERT INTO DETECTION_FRAMES (
        search_id,
        frame_number,
        frame_timestamp_ms,
        image_path,
        analysis_status
      ) VALUES (
        :searchId,
        :frameNumber,
        :frameTimestampMs,
        :imagePath,
        'PENDING'
      )
    `;

    // Map objects to bind rows
    const binds = frames.map((f) => ({
      searchId: f.searchId,
      frameNumber: f.frameNumber,
      frameTimestampMs: f.frameTimestampMs,
      imagePath: f.imagePath,
    }));

    // Pre-declare types and max string lengths via bindDefs for maximum throughput
    const result = await conn.executeMany(sql, binds, {
      autoCommit: true,
      bindDefs: {
        searchId:         { type: oracledb.NUMBER },
        frameNumber:      { type: oracledb.NUMBER },
        frameTimestampMs: { type: oracledb.NUMBER },
        imagePath:        { type: oracledb.STRING, maxSize: 500 },
      },
    });

    return result.rowsAffected ?? 0;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}
