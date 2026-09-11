import oracledb, {
  type Pool,
  type Connection,
  type BindParameters,
  type ExecuteOptions,
  type Result,
} from 'oracledb';
import { env } from './env';
import { logger } from '../utils/logger';

// Enable pure Thin Mode in node-oracledb
// Thin mode does not require Oracle Instant Client C binaries and communicates directly over TCP/IP
try {
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.autoCommit = false; // Require explicit commit for transaction safety
} catch (err) {
  logger.warn('Error configuring oracledb defaults', { error: err });
}

export interface DatabasePool {
  init(): Promise<void>;
  close(): Promise<void>;
  execute<T = unknown>(
    sql: string,
    binds?: BindParameters,
    options?: ExecuteOptions
  ): Promise<Result<T>>;
  withTransaction<T>(
    callback: (connection: Connection) => Promise<T>
  ): Promise<T>;
  isMock(): boolean;
  recoverStaleJobs(): Promise<number>;
  clearOperationalData(): Promise<{ cleared: string[]; count: number }>;
}

class OracleDatabaseManager implements DatabasePool {
  private pool: Pool | null = null;
  private isFallbackMode = false;

  // In-memory relational store fallback for testing or when Oracle XE is offline
  private inMemoryTables: Record<string, Record<string, unknown>[]> = {
    users: [],
    cameras: [],
    videos: [],
    video_files: [],
    searches: [],
    search_sessions: [],
    detections: [],
    detection_results: [],
    object_tracks: [],
    search_results: [],
    camera_events: [],
    search_events: [],
    audit_logs: [],
    evidence_files: [],
    camera_calibrations: [],
    camera_stream_status: [],
    search_jobs: [],
    search_targets: [],
  };

  async init(): Promise<void> {
    if (this.pool) {
      return;
    }

    // In testing environments or CI without active Oracle 21c XE container, use fallback adapter immediately
    if (process.env.NODE_ENV === 'test' && process.env.FORCE_ORACLE !== 'true') {
      this.isFallbackMode = true;
      logger.info('Test environment detected. Using in-memory relational persistence adapter.');
      return;
    }

    const connectString = env.ORACLE_CONNECTION_STRING || `${env.ORACLE_HOST}:${env.ORACLE_PORT}/${env.ORACLE_SERVICE_NAME}`;

    try {
      logger.info('Initializing Oracle Database connection pool...', {
        host: env.ORACLE_HOST,
        port: env.ORACLE_PORT,
        service: env.ORACLE_SERVICE_NAME,
        user: env.ORACLE_USER,
      });

      this.pool = await oracledb.createPool({
        user: env.ORACLE_USER,
        password: env.ORACLE_PASSWORD,
        connectString,
        poolMin: env.ORACLE_POOL_MIN,
        poolMax: env.ORACLE_POOL_MAX,
        poolIncrement: env.ORACLE_POOL_INCREMENT,
        poolTimeout: env.ORACLE_POOL_TIMEOUT,
      });

      // Verify connection credentials and schema reachability
      const testConn = await this.pool.getConnection();
      await testConn.close();

      this.isFallbackMode = false;
      logger.info('Oracle Database 21c XE connection pool successfully initialized');
    } catch (error) {
      logger.warn(
        'Could not connect to Oracle 21c XE instance. Activating in-memory persistence adapter for testing & offline mode.',
        { error }
      );
      if (this.pool) {
        try {
          await this.pool.close(0);
        } catch {
          // ignore
        }
        this.pool = null;
      }
      this.isFallbackMode = true;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close(10);
        this.pool = null;
        logger.info('Oracle Database connection pool gracefully closed');
      } catch (error) {
        logger.error('Error closing Oracle Database connection pool', error);
      }
    }
  }

  isMock(): boolean {
    return this.isFallbackMode;
  }

  getInMemoryStore() {
    return this.inMemoryTables;
  }

  async execute<T = unknown>(
    sql: string,
    binds: BindParameters = {},
    options: ExecuteOptions = {}
  ): Promise<Result<T>> {
    if (this.isFallbackMode || !this.pool) {
      return this.executeFallback<T>(sql, binds);
    }

    let connection: Connection | null = null;
    try {
      connection = await this.pool.getConnection();
      const result = await connection.execute<T>(sql, binds, {
        autoCommit: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        ...options,
      });
      return result;
    } catch (error: any) {
      logger.error('Oracle database execution error', { error: error.message || error, sql });
      if (error && (error.code === 'NJS-003' || error.errorNum === 3113 || error.errorNum === 3114)) {
        logger.warn('Oracle connection lost; activating fallback adapter', { error });
        this.isFallbackMode = true;
        return this.executeFallback<T>(sql, binds);
      }
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeErr) {
          logger.error('Error returning Oracle connection to pool', closeErr);
        }
      }
    }
  }

  async withTransaction<T>(
    callback: (connection: Connection) => Promise<T>
  ): Promise<T> {
    if (this.isFallbackMode || !this.pool) {
      // Snapshot in-memory state for atomic rollback
      const snapshot = JSON.stringify(this.inMemoryTables);
      const mockConn: Partial<Connection> = {
        execute: async (sql: any, binds: any) => this.executeFallback(sql, binds),
        commit: async () => {},
        rollback: async () => {
          this.inMemoryTables = JSON.parse(snapshot);
        },
        close: async () => {},
      };
      try {
        const result = await callback(mockConn as Connection);
        return result;
      } catch (error) {
        this.inMemoryTables = JSON.parse(snapshot);
        throw error;
      }
    }

    let connection: Connection | null = null;
    try {
      connection = await this.pool.getConnection();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
          logger.warn('Transaction rolled back successfully after error');
        } catch (rollbackErr) {
          logger.error('Failed to rollback transaction', rollbackErr);
        }
      }
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeErr) {
          logger.error('Error releasing transaction connection', closeErr);
        }
      }
    }
  }

  /**
   * Fallback SQL interpreter for testing environments without active Oracle XE instance
   */
  private executeFallback<T>(sql: string, binds: BindParameters): Result<T> {
    const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
    const bindObj = (Array.isArray(binds) ? {} : binds) as Record<string, unknown>;

    if (normalized.startsWith('INSERT INTO USERS')) {
      const row = {
        ID: bindObj.id,
        USER_ID: bindObj.id,
        USERNAME: bindObj.username || String(bindObj.email || '').split('@')[0],
        EMAIL: bindObj.email,
        PASSWORD_HASH: bindObj.passwordHash,
        FULL_NAME: bindObj.fullName,
        ROLE: bindObj.role || 'USER',
        REFRESH_TOKEN_HASH: bindObj.refreshTokenHash || null,
        IS_ACTIVE: bindObj.isActive !== undefined ? (bindObj.isActive ? 1 : 0) : 1,
        LAST_LOGIN_AT: null,
        LAST_LOGIN: null,
        FAILED_LOGIN_ATTEMPTS: Number(bindObj.failedLoginAttempts || 0),
        LOCKED_UNTIL: bindObj.lockedUntil ? new Date(bindObj.lockedUntil as any) : null,
        CREATED_AT: new Date(),
        UPDATED_AT: new Date(),
      };
      this.inMemoryTables.users.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM USERS') && (normalized.includes('LOWER(EMAIL)') || normalized.includes('LOWER(USERNAME)'))) {
      const val = String(bindObj.cleanEmail || bindObj.cleanUsername || bindObj.email || bindObj.identifier || bindObj.clean || bindObj.username || '').toLowerCase();
      const found = this.inMemoryTables.users.find(
        (u) => String(u.EMAIL).toLowerCase() === val || String(u.USERNAME || '').toLowerCase() === val
      );
      return { rows: found ? ([found] as T[]) : [] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM USERS') && normalized.includes('WHERE ID = :ID')) {
      const id = String(bindObj.id);
      const found = this.inMemoryTables.users.find((u) => String(u.ID) === id || String(u.USER_ID) === id);
      return { rows: found ? ([found] as T[]) : [] };
    }

    if (normalized.startsWith('SELECT COUNT(')) {
      for (const key of Object.keys(this.inMemoryTables)) {
        if (normalized.includes(`FROM ${key.toUpperCase()}`)) {
          const count = this.inMemoryTables[key].length;
          return { rows: [{ TOTAL: count, COUNT: count, CNT: count }] as T[] };
        }
      }
      return { rows: [{ TOTAL: 0, COUNT: 0, CNT: 0 }] as T[] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM USERS')) {
      let users = [...this.inMemoryTables.users];
      if (bindObj.role) {
        users = users.filter((u) => u.ROLE === bindObj.role);
      }
      return { rows: users as T[] };
    }

    if (normalized.startsWith('UPDATE USERS')) {
      const user = this.inMemoryTables.users.find((u) => u.ID === bindObj.id);
      if (user) {
        if (bindObj.refreshTokenHash !== undefined) user.REFRESH_TOKEN_HASH = bindObj.refreshTokenHash;
        if (bindObj.attempts !== undefined) user.FAILED_LOGIN_ATTEMPTS = Number(bindObj.attempts);
        if (bindObj.lockedUntil !== undefined) user.LOCKED_UNTIL = bindObj.lockedUntil ? new Date(bindObj.lockedUntil as any) : null;
        if (bindObj.role !== undefined) user.ROLE = bindObj.role;
        if (bindObj.isActive !== undefined) user.IS_ACTIVE = bindObj.isActive ? 1 : 0;
        if (bindObj.fullName !== undefined) user.FULL_NAME = bindObj.fullName;
        if (bindObj.passwordHash !== undefined) user.PASSWORD_HASH = bindObj.passwordHash;
        if (normalized.includes('FAILED_LOGIN_ATTEMPTS = 0')) {
          user.FAILED_LOGIN_ATTEMPTS = 0;
          user.LOCKED_UNTIL = null;
        }
        if (normalized.includes('LAST_LOGIN_AT = CURRENT_TIMESTAMP')) {
          user.LAST_LOGIN_AT = new Date();
        }
        user.UPDATED_AT = new Date();
      }
      return { rowsAffected: user ? 1 : 0 };
    }

    if (normalized.startsWith('INSERT INTO CAMERAS')) {
      const row = {
        ID: bindObj.id,
        USER_ID: bindObj.userId,
        NAME: bindObj.name,
        LOCATION: bindObj.location,
        SOURCE_TYPE: bindObj.sourceType || 'RTSP',
        SOURCE_URI_ENCRYPTED: bindObj.sourceUriEncrypted || bindObj.rtspUrlEncrypted,
        RTSP_URL_ENCRYPTED: bindObj.sourceUriEncrypted || bindObj.rtspUrlEncrypted,
        ENABLED: bindObj.enabled !== undefined ? Number(bindObj.enabled) : 1,
        PRIORITY: bindObj.priority !== undefined ? Number(bindObj.priority) : 1,
        CALIBRATION_ID: bindObj.calibrationId || null,
        STATUS: bindObj.status || 'OFFLINE',
        LAST_CONNECTED_AT: null,
        CREATED_AT: new Date(),
        UPDATED_AT: new Date(),
      };
      this.inMemoryTables.cameras.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT COUNT(*)')) {
      const match = normalized.match(/FROM\s+([A-Za-z0-9_]+)/i);
      if (match) {
        const table = match[1].toLowerCase();
        let list: any[] = [];
        if (table === 'users') list = this.inMemoryTables.users;
        else if (table === 'cameras') list = this.inMemoryTables.cameras;
        else if (table === 'search_sessions') list = this.inMemoryTables.search_sessions;
        else if (table === 'object_tracks') list = this.inMemoryTables.object_tracks;
        else if (table === 'detections') list = this.inMemoryTables.detections;
        else if (table === 'audit_logs') list = this.inMemoryTables.audit_logs;
        else if (table === 'searches') list = this.inMemoryTables.searches;
        else if ((this.inMemoryTables as any)[table]) list = (this.inMemoryTables as any)[table];
        return { rows: [{ CNT: list.length, cnt: list.length }] as T[] };
      }
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM CAMERAS')) {
      let cameras = [...this.inMemoryTables.cameras];
      if (bindObj.userId) {
        cameras = cameras.filter((c) => c.USER_ID === bindObj.userId);
      }
      if (bindObj.id) {
        cameras = cameras.filter((c) => c.ID === bindObj.id);
      }
      return { rows: cameras as T[] };
    }

    if (normalized.startsWith('UPDATE CAMERAS')) {
      const camera = this.inMemoryTables.cameras.find((c) => c.ID === bindObj.id);
      if (camera) {
        if (bindObj.name !== undefined) camera.NAME = bindObj.name;
        if (bindObj.location !== undefined) camera.LOCATION = bindObj.location;
        if (bindObj.sourceType !== undefined) camera.SOURCE_TYPE = bindObj.sourceType;
        if (bindObj.sourceUriEncrypted !== undefined) {
          camera.SOURCE_URI_ENCRYPTED = bindObj.sourceUriEncrypted;
          camera.RTSP_URL_ENCRYPTED = bindObj.sourceUriEncrypted;
        }
        if (bindObj.rtspUrlEncrypted !== undefined) {
          camera.RTSP_URL_ENCRYPTED = bindObj.rtspUrlEncrypted;
          camera.SOURCE_URI_ENCRYPTED = bindObj.rtspUrlEncrypted;
        }
        if (bindObj.enabled !== undefined) camera.ENABLED = Number(bindObj.enabled);
        if (bindObj.priority !== undefined) camera.PRIORITY = Number(bindObj.priority);
        if (bindObj.calibrationId !== undefined) camera.CALIBRATION_ID = bindObj.calibrationId;
        if (bindObj.status !== undefined) camera.STATUS = bindObj.status;
        if (bindObj.lastConnectedAt !== undefined) camera.LAST_CONNECTED_AT = bindObj.lastConnectedAt;
      }
      return { rowsAffected: camera ? 1 : 0 };
    }

    if (normalized.startsWith('DELETE FROM CAMERAS')) {
      const initialLen = this.inMemoryTables.cameras.length;
      this.inMemoryTables.cameras = this.inMemoryTables.cameras.filter(
        (c) => !(c.ID === bindObj.id && c.USER_ID === bindObj.userId)
      );
      return { rowsAffected: initialLen - this.inMemoryTables.cameras.length };
    }

    if (normalized.startsWith('INSERT INTO VIDEOS')) {
      const row = {
        ID: bindObj.id,
        USER_ID: bindObj.userId,
        ORIGINAL_FILENAME: bindObj.originalFilename,
        STORAGE_PATH: bindObj.storagePath,
        MIME_TYPE: bindObj.mimeType,
        FILE_SIZE_BYTES: bindObj.fileSizeBytes,
        DURATION_SECONDS: bindObj.durationSeconds || null,
        FRAME_RATE: bindObj.frameRate || null,
        RESOLUTION: bindObj.resolution || null,
        STATUS: bindObj.status || 'READY',
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.videos.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM VIDEOS')) {
      let videos = [...this.inMemoryTables.videos];
      if (bindObj.userId) {
        videos = videos.filter((v) => v.USER_ID === bindObj.userId);
      }
      if (bindObj.id) {
        videos = videos.filter((v) => v.ID === bindObj.id);
      }
      return { rows: videos as T[] };
    }

    if (normalized.startsWith('DELETE FROM VIDEOS')) {
      const initialLen = this.inMemoryTables.videos.length;
      this.inMemoryTables.videos = this.inMemoryTables.videos.filter(
        (v) => !(v.ID === bindObj.id && v.USER_ID === bindObj.userId)
      );
      return { rowsAffected: initialLen - this.inMemoryTables.videos.length };
    }

    if (normalized.startsWith('INSERT INTO SEARCH_SESSIONS')) {
      const row = {
        ID: bindObj.id,
        USER_ID: bindObj.userId,
        OBJECT_NAME: bindObj.objectName,
        DESCRIPTION: bindObj.description || null,
        SOURCE_TYPE: bindObj.sourceType,
        SOURCE_ID: bindObj.sourceId,
        STATUS: bindObj.status || 'QUEUED',
        PROGRESS_PERCENT: bindObj.progressPercent || 0,
        STARTED_AT: new Date(),
        COMPLETED_AT: null,
        ERROR_MESSAGE: null,
      };
      this.inMemoryTables.search_sessions.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('UPDATE SEARCH_SESSIONS')) {
      const search = this.inMemoryTables.search_sessions.find((s) => s.ID === bindObj.id);
      if (search) {
        if (bindObj.status !== undefined) search.STATUS = bindObj.status;
        if (bindObj.progressPercent !== undefined) search.PROGRESS_PERCENT = bindObj.progressPercent;
        if (bindObj.completedAt !== undefined) search.COMPLETED_AT = bindObj.completedAt;
        if (bindObj.errorMessage !== undefined) search.ERROR_MESSAGE = bindObj.errorMessage;
      }
      return { rowsAffected: search ? 1 : 0 };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM SEARCH_SESSIONS')) {
      let searches = [...this.inMemoryTables.search_sessions];
      if (bindObj.userId) {
        searches = searches.filter((s) => s.USER_ID === bindObj.userId);
      }
      if (bindObj.id) {
        searches = searches.filter((s) => s.ID === bindObj.id);
      }
      return { rows: searches as T[] };
    }

    if (normalized.startsWith('INSERT INTO SEARCH_EVENTS')) {
      const row = {
        ID: bindObj.id,
        SEARCH_ID: bindObj.searchId,
        STAGE: bindObj.stage,
        PROGRESS: bindObj.progress,
        MESSAGE: bindObj.message,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.search_events.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM SEARCH_EVENTS')) {
      let events = [...this.inMemoryTables.search_events];
      if (bindObj.searchId) {
        events = events.filter((e) => e.SEARCH_ID === bindObj.searchId);
      }
      return { rows: events as T[] };
    }

    if (normalized.startsWith('INSERT INTO DETECTION_RESULTS')) {
      const row = {
        ID: bindObj.id,
        SEARCH_ID: bindObj.searchId,
        FOUND: bindObj.found,
        CONFIDENCE: bindObj.confidence,
        DETECTED_LABEL: bindObj.detectedLabel,
        DOMINANT_COLOR: bindObj.dominantColor || null,
        COLOR_CONFIDENCE: bindObj.colorConfidence != null ? bindObj.colorConfidence : null,
        SECONDARY_COLORS_JSON: bindObj.secondaryColorsJson || null,
        FRAME_TIMESTAMP_MS: bindObj.frameTimestampMs || null,
        EVIDENCE_FRAME_PATH: bindObj.evidenceFramePath || null,
        BOUNDING_BOX_JSON: bindObj.boundingBoxJson || null,
        TRACK_ID: bindObj.trackId != null ? Number(bindObj.trackId) : null,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.detection_results.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM DETECTION_RESULTS')) {
      let results = [...this.inMemoryTables.detection_results];
      if (bindObj.searchId) {
        results = results.filter((d) => String(d.SEARCH_ID) === String(bindObj.searchId));
      }
      if (bindObj.id) {
        results = results.filter((d) => String(d.ID) === String(bindObj.id));
      }
      return { rows: results as T[] };
    }

    if (normalized.startsWith('INSERT INTO DETECTIONS')) {
      const nextId = this.inMemoryTables.detections.length + 1;
      const row = {
        DETECTION_ID: bindObj.id || bindObj.detectionId || nextId,
        ID: bindObj.id || bindObj.detectionId || nextId,
        USER_ID: bindObj.userId,
        SEARCH_ID: bindObj.searchId,
        CAMERA_ID: bindObj.cameraId || null,
        OBJECT_NAME: bindObj.objectName,
        CONFIDENCE: Number(bindObj.confidence || 0),
        TIMESTAMP_SECONDS: Number(bindObj.timestampSeconds || 0),
        VIDEO_TIMESTAMP: bindObj.videoTimestamp || '00:00',
        FRAME_NUMBER: Number(bindObj.frameNumber || 0),
        BOUNDING_BOX_X: Number(bindObj.boundingBoxX || 0),
        BOUNDING_BOX_Y: Number(bindObj.boundingBoxY || 0),
        BOUNDING_BOX_WIDTH: Number(bindObj.boundingBoxWidth || 0),
        BOUNDING_BOX_HEIGHT: Number(bindObj.boundingBoxHeight || 0),
        DETECTION_STATUS: bindObj.detectionStatus || 'ACQUIRED',
        DETECTION_IMAGE: bindObj.detectionImage || null,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.detections.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM DETECTIONS')) {
      let detections = [...this.inMemoryTables.detections];
      const targetId = bindObj.id || bindObj.detectionId;
      if (targetId !== undefined) {
        detections = detections.filter(
          (d) => String(d.DETECTION_ID) === String(targetId) || String(d.ID) === String(targetId)
        );
      }
      if (bindObj.searchId) {
        detections = detections.filter((d) => String(d.SEARCH_ID) === String(bindObj.searchId));
      }
      return { rows: detections as T[] };
    }

    if (normalized.startsWith('INSERT INTO SEARCHES')) {
      const nextId = this.inMemoryTables.searches.length + 1;
      const row = {
        SEARCH_ID: bindObj.id || bindObj.searchId || nextId,
        ID: bindObj.id || bindObj.searchId || nextId,
        USER_ID: bindObj.userId,
        OBJECT_NAME: bindObj.objectName,
        CAMERA_ID: bindObj.cameraId || null,
        SEARCH_STATUS: bindObj.searchStatus || 'PROCESSING',
        STARTED_AT: new Date(),
        COMPLETED_AT: null,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.searches.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM SEARCHES')) {
      let searches = [...this.inMemoryTables.searches];
      const targetId = bindObj.id || bindObj.searchId;
      if (targetId !== undefined) {
        searches = searches.filter(
          (s) => String(s.SEARCH_ID) === String(targetId) || String(s.ID) === String(targetId)
        );
      }
      if (bindObj.userId) {
        searches = searches.filter((s) => String(s.USER_ID) === String(bindObj.userId));
      }
      return { rows: searches as T[] };
    }

    if (normalized.startsWith('INSERT INTO SEARCH_TARGETS')) {
      const row = {
        ID: bindObj.id,
        SEARCH_ID: bindObj.searchId,
        TARGET_TEXT: bindObj.targetText,
        TARGET_CLASS: bindObj.targetClass || null,
        TARGET_COLOR: bindObj.targetColor || null,
        NORMALIZED_TARGET: bindObj.normalizedTarget,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.search_targets.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM SEARCH_TARGETS')) {
      let targets = [...this.inMemoryTables.search_targets];
      if (bindObj.searchId) {
        targets = targets.filter((t) => t.SEARCH_ID === bindObj.searchId);
      }
      return { rows: targets as T[] };
    }

    if (normalized.startsWith('INSERT INTO OBJECT_TRACKS')) {
      const row = {
        ID: bindObj.id,
        SEARCH_ID: bindObj.searchId,
        TRACK_ID: bindObj.trackId,
        CLASS_NAME: bindObj.className,
        CONFIDENCE: bindObj.confidence,
        FRAME_INDEX: bindObj.frameIndex,
        TIMESTAMP_MS: bindObj.timestampMs,
        BBOX_X: bindObj.bboxX,
        BBOX_Y: bindObj.bboxY,
        BBOX_WIDTH: bindObj.bboxWidth,
        BBOX_HEIGHT: bindObj.bboxHeight,
        STATUS: bindObj.status || 'ACTIVE',
        LAST_SEEN: new Date(),
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.object_tracks.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM OBJECT_TRACKS')) {
      let tracks = [...this.inMemoryTables.object_tracks];
      if (bindObj.searchId) {
        tracks = tracks.filter((t) => t.SEARCH_ID === bindObj.searchId);
      }
      return { rows: tracks as T[] };
    }

    if (normalized.startsWith('INSERT INTO SEARCH_RESULTS')) {
      const row = {
        ID: bindObj.id,
        SEARCH_ID: bindObj.searchId,
        TARGET_NAME: bindObj.targetName,
        TARGET_FOUND: bindObj.targetFound,
        FINAL_CONFIDENCE: bindObj.finalConfidence,
        DETECTION_ID: bindObj.detectionId || null,
        MATCHED_TRACK_ID: bindObj.matchedTrackId || null,
        SUMMARY_NOTES: bindObj.summaryNotes || null,
        LAST_SEEN_TIMESTAMP: bindObj.lastSeenTimestamp || null,
        LAST_SEEN_FRAME: bindObj.lastSeenFrame !== undefined ? bindObj.lastSeenFrame : null,
        LAST_SEEN_BBOX: bindObj.lastSeenBbox || null,
        LAST_SEEN_CONFIDENCE: bindObj.lastSeenConfidence !== undefined ? bindObj.lastSeenConfidence : null,
        LAST_SEEN_COLOR: bindObj.lastSeenColor || null,
        LAST_SEEN_EVIDENCE_PATH: bindObj.lastSeenEvidencePath || null,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.search_results.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM SEARCH_RESULTS')) {
      let results = [...this.inMemoryTables.search_results];
      if (bindObj.searchId) {
        results = results.filter((r) => r.SEARCH_ID === bindObj.searchId);
      }
      return { rows: results as T[] };
    }


    if (normalized.startsWith('INSERT INTO EVIDENCE_FILES')) {
      const row = {
        ID: bindObj.id,
        SESSION_ID: bindObj.sessionId,
        DETECTION_ID: bindObj.detectionId || null,
        TRACK_ID: bindObj.trackId != null ? Number(bindObj.trackId) : null,
        VIDEO_ID: bindObj.videoId || null,
        FRAME_NUMBER: Number(bindObj.frameNumber),
        TIMESTAMP_MS: Number(bindObj.timestampMs),
        ORIGINAL_IMAGE_PATH: bindObj.originalImagePath,
        ANNOTATED_IMAGE_PATH: bindObj.annotatedImagePath || null,
        SELECTION_POLICY: bindObj.selectionPolicy || 'highest_confidence',
        CONFIDENCE: bindObj.confidence != null ? Number(bindObj.confidence) : null,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.evidence_files.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM EVIDENCE_FILES')) {
      let files = [...this.inMemoryTables.evidence_files];
      if (bindObj.sessionId) {
        files = files.filter((f) => f.SESSION_ID === bindObj.sessionId);
      }
      if (bindObj.id) {
        files = files.filter((f) => f.ID === bindObj.id);
      }
      return { rows: files as T[] };
    }

    if (normalized.startsWith('INSERT INTO CAMERA_CALIBRATIONS')) {
      const row = {
        ID: bindObj.id,
        CAMERA_ID: bindObj.cameraId,
        IMAGE_WIDTH: Number(bindObj.imageWidth),
        IMAGE_HEIGHT: Number(bindObj.imageHeight),
        FX: Number(bindObj.fx),
        FY: Number(bindObj.fy),
        CX: Number(bindObj.cx),
        CY: Number(bindObj.cy),
        DISTORTION_MODEL: bindObj.distortionModel || 'NONE',
        DISTORTION_COEFFICIENTS: bindObj.distortionCoefficients || '[]',
        CALIBRATION_STATUS: bindObj.calibrationStatus || 'UNCALIBRATED',
        LOCALIZATION_MODE: bindObj.localizationMode || 'RAY_ONLY',
        CALIBRATED_AT: bindObj.calibratedAt ? new Date(bindObj.calibratedAt as any) : null,
        VERSION: Number(bindObj.version) || 1,
        CREATED_AT: new Date(),
        UPDATED_AT: new Date(),
      };
      this.inMemoryTables.camera_calibrations.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('UPDATE CAMERA_CALIBRATIONS')) {
      let updatedCount = 0;
      for (const row of this.inMemoryTables.camera_calibrations) {
        if (row.CAMERA_ID === bindObj.cameraId) {
          if (bindObj.imageWidth !== undefined) row.IMAGE_WIDTH = Number(bindObj.imageWidth);
          if (bindObj.imageHeight !== undefined) row.IMAGE_HEIGHT = Number(bindObj.imageHeight);
          if (bindObj.fx !== undefined) row.FX = Number(bindObj.fx);
          if (bindObj.fy !== undefined) row.FY = Number(bindObj.fy);
          if (bindObj.cx !== undefined) row.CX = Number(bindObj.cx);
          if (bindObj.cy !== undefined) row.CY = Number(bindObj.cy);
          if (bindObj.distortionModel !== undefined) row.DISTORTION_MODEL = bindObj.distortionModel;
          if (bindObj.distortionCoefficients !== undefined) row.DISTORTION_COEFFICIENTS = bindObj.distortionCoefficients;
          if (bindObj.calibrationStatus !== undefined) row.CALIBRATION_STATUS = bindObj.calibrationStatus;
          if (bindObj.localizationMode !== undefined) row.LOCALIZATION_MODE = bindObj.localizationMode;
          if (bindObj.calibratedAt !== undefined) row.CALIBRATED_AT = bindObj.calibratedAt ? new Date(bindObj.calibratedAt as any) : null;
          if (bindObj.version !== undefined) row.VERSION = Number(bindObj.version);
          row.UPDATED_AT = new Date();
          updatedCount++;
        }
      }
      return { rowsAffected: updatedCount, rows: [] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM CAMERA_CALIBRATIONS')) {
      let calibs = [...this.inMemoryTables.camera_calibrations];
      if (bindObj.cameraId) {
        calibs = calibs.filter((c) => c.CAMERA_ID === bindObj.cameraId);
      }
      if (bindObj.id) {
        calibs = calibs.filter((c) => c.ID === bindObj.id);
      }
      return { rows: calibs as T[] };
    }

    if (normalized.startsWith('INSERT INTO CAMERA_STREAM_STATUS')) {
      const row = {
        CAMERA_ID: bindObj.cameraId,
        STATUS: bindObj.status || 'STOPPED',
        CONNECTED_AT: bindObj.connectedAt ? new Date(bindObj.connectedAt as any) : null,
        LAST_FRAME_AT: bindObj.lastFrameAt ? new Date(bindObj.lastFrameAt as any) : null,
        LAST_ERROR: bindObj.lastError || null,
        CURRENT_FPS: Number(bindObj.currentFps) || 0.0,
        FRAMES_RECEIVED: Number(bindObj.framesReceived) || 0,
        FRAMES_DROPPED: Number(bindObj.framesDropped) || 0,
        RECONNECT_ATTEMPTS: Number(bindObj.reconnectAttempts) || 0,
        UPDATED_AT: new Date(),
      };
      this.inMemoryTables.camera_stream_status.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('UPDATE CAMERA_STREAM_STATUS')) {
      let updatedCount = 0;
      for (const row of this.inMemoryTables.camera_stream_status) {
        if (row.CAMERA_ID === bindObj.cameraId) {
          if (bindObj.status !== undefined) row.STATUS = bindObj.status;
          if (bindObj.connectedAt !== undefined) row.CONNECTED_AT = bindObj.connectedAt ? new Date(bindObj.connectedAt as any) : null;
          if (bindObj.lastFrameAt !== undefined) row.LAST_FRAME_AT = bindObj.lastFrameAt ? new Date(bindObj.lastFrameAt as any) : null;
          if (bindObj.lastError !== undefined) row.LAST_ERROR = bindObj.lastError;
          if (bindObj.currentFps !== undefined) row.CURRENT_FPS = Number(bindObj.currentFps);
          if (bindObj.framesReceived !== undefined) row.FRAMES_RECEIVED = Number(bindObj.framesReceived);
          if (bindObj.framesDropped !== undefined) row.FRAMES_DROPPED = Number(bindObj.framesDropped);
          if (bindObj.reconnectAttempts !== undefined) row.RECONNECT_ATTEMPTS = Number(bindObj.reconnectAttempts);
          row.UPDATED_AT = new Date();
          updatedCount++;
        }
      }
      return { rowsAffected: updatedCount, rows: [] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM CAMERA_STREAM_STATUS')) {
      let statuses = [...this.inMemoryTables.camera_stream_status];
      if (bindObj.cameraId) {
        statuses = statuses.filter((s) => s.CAMERA_ID === bindObj.cameraId);
      }
      return { rows: statuses as T[] };
    }

    if (normalized.startsWith('INSERT INTO SEARCH_JOBS')) {
      const row = {
        ID: bindObj.id,
        SESSION_ID: bindObj.sessionId,
        CAMERA_ID: bindObj.cameraId,
        JOB_STATUS: bindObj.jobStatus || 'QUEUED',
        STARTED_AT: bindObj.startedAt ? new Date(bindObj.startedAt as any) : new Date(),
        ENDED_AT: null,
        FRAMES_PROCESSED: Number(bindObj.framesProcessed) || 0,
        LAST_FRAME_AT: null,
        ERROR_MESSAGE: null,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.search_jobs.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('UPDATE SEARCH_JOBS')) {
      let updatedCount = 0;
      for (const row of this.inMemoryTables.search_jobs) {
        const matches = (bindObj.id && row.ID === bindObj.id) ||
          (bindObj.sessionId && row.SESSION_ID === bindObj.sessionId && bindObj.cameraId && row.CAMERA_ID === bindObj.cameraId);
        if (matches) {
          if (bindObj.jobStatus !== undefined) row.JOB_STATUS = bindObj.jobStatus;
          if (bindObj.endedAt !== undefined) row.ENDED_AT = bindObj.endedAt ? new Date(bindObj.endedAt as any) : null;
          if (bindObj.framesProcessed !== undefined) row.FRAMES_PROCESSED = Number(bindObj.framesProcessed);
          if (bindObj.lastFrameAt !== undefined) row.LAST_FRAME_AT = bindObj.lastFrameAt ? new Date(bindObj.lastFrameAt as any) : null;
          if (bindObj.errorMessage !== undefined) row.ERROR_MESSAGE = bindObj.errorMessage;
          updatedCount++;
        }
      }
      return { rowsAffected: updatedCount, rows: [] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM SEARCH_JOBS')) {
      let jobs = [...this.inMemoryTables.search_jobs];
      if (bindObj.sessionId) {
        jobs = jobs.filter((j) => j.SESSION_ID === bindObj.sessionId);
      }
      if (bindObj.cameraId) {
        jobs = jobs.filter((j) => j.CAMERA_ID === bindObj.cameraId);
      }
      if (bindObj.id) {
        jobs = jobs.filter((j) => j.ID === bindObj.id);
      }
      return { rows: jobs as T[] };
    }

    if (normalized.includes('FROM DUAL')) {
      return { rows: [{ 1: 1 }] as T[] };
    }

    if (normalized.startsWith('INSERT INTO AUDIT_LOGS')) {
      const row = {
        ID: bindObj.id,
        USER_ID: bindObj.userId || null,
        ACTION: bindObj.action,
        RESOURCE_TYPE: bindObj.resourceType,
        RESOURCE_ID: bindObj.resourceId || null,
        IP_ADDRESS: bindObj.ipAddress || null,
        USER_AGENT: bindObj.userAgent || null,
        REQUEST_ID: bindObj.requestId || null,
        STATUS: bindObj.status,
        DETAILS_JSON: bindObj.detailsJson || null,
        PREVIOUS_HASH: bindObj.previousHash || null,
        CURRENT_HASH: bindObj.currentHash || null,
        CREATED_AT: new Date(),
      };
      this.inMemoryTables.audit_logs.push(row);
      return { rowsAffected: 1, rows: [row as T] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM AUDIT_LOGS')) {
      let logs = [...this.inMemoryTables.audit_logs];
      if (normalized.includes('ORDER BY CREATED_AT DESC')) {
        logs.reverse();
      }
      if (normalized.includes('FETCH FIRST 1 ROWS ONLY')) {
        return { rows: logs.slice(0, 1) as T[] };
      }
      if (bindObj.limit) {
        logs = logs.slice(0, Number(bindObj.limit));
      }
      return { rows: logs as T[] };
    }

    return { rowsAffected: 0, rows: [] };
  }

  async recoverStaleJobs(): Promise<number> {
    const staleStatuses = ['QUEUED', 'INITIALIZING', 'PROCESSING', 'EXTRACTING_FRAMES', 'ANALYZING', 'TRACKING', 'VERIFYING', 'PROCESSING_LIVE'];
    let recoveredCount = 0;

    if (this.isFallbackMode || !this.pool) {
      for (const session of this.inMemoryTables.search_sessions) {
        if (staleStatuses.includes(String(session.STATUS))) {
          session.STATUS = 'FAILED';
          session.ERROR_MESSAGE = 'SERVER_RESTARTED: Job was interrupted by server restart. Resuming is not supported; please re-submit search.';
          session.COMPLETED_AT = new Date();
          recoveredCount++;
        }
      }
      for (const job of this.inMemoryTables.search_jobs) {
        if (staleStatuses.includes(String(job.JOB_STATUS))) {
          job.JOB_STATUS = 'FAILED';
          job.ERROR_MESSAGE = 'SERVER_RESTARTED: Job was interrupted by server restart.';
          job.ENDED_AT = new Date();
        }
      }
    } else {
      try {
        const sql = `
          UPDATE SEARCH_SESSIONS
          SET status = 'FAILED',
              error_message = 'SERVER_RESTARTED: Job was interrupted by server restart. Resuming is not supported; please re-submit search.',
              completed_at = CURRENT_TIMESTAMP
          WHERE status IN ('QUEUED', 'INITIALIZING', 'PROCESSING', 'EXTRACTING_FRAMES', 'ANALYZING', 'TRACKING', 'VERIFYING')
        `;
        const res = await this.execute(sql);
        recoveredCount = res.rowsAffected || 0;

        const jobSql = `
          UPDATE SEARCH_JOBS
          SET job_status = 'FAILED',
              error_message = 'SERVER_RESTARTED: Job was interrupted by server restart.',
              ended_at = CURRENT_TIMESTAMP
          WHERE job_status IN ('QUEUED', 'PROCESSING_LIVE', 'INITIALIZING')
        `;
        await this.execute(jobSql);
      } catch (err) {
        logger.error('Error recovering stale search sessions in Oracle XE', err);
      }
    }

    if (recoveredCount > 0) {
      logger.warn(`Crash Recovery: marked ${recoveredCount} stale/interrupted search sessions as FAILED on startup.`);
    }
    return recoveredCount;
  }

  async clearOperationalData(): Promise<{ cleared: string[]; count: number }> {
    let count = 0;
    const tableKeys = [
      'searches',
      'search_sessions',
      'detections',
      'detection_results',
      'object_tracks',
      'search_results',
      'camera_events',
      'search_events',
      'evidence_files',
      'search_jobs',
      'search_targets',
      'audit_logs',
      'videos',
      'video_files',
    ];

    if (this.isFallbackMode || !this.pool) {
      for (const t of tableKeys) {
        if (this.inMemoryTables[t]) {
          count += this.inMemoryTables[t].length;
          this.inMemoryTables[t] = [];
        }
      }
    } else {
      const oracleTables = [
        'SEARCH_TARGETS',
        'SEARCH_EVENTS',
        'SEARCH_JOBS',
        'SEARCH_RESULTS',
        'OBJECT_TRACKS',
        'DETECTION_RESULTS',
        'DETECTIONS',
        'EVIDENCE_FILES',
        'SEARCH_SESSIONS',
        'AUDIT_LOGS',
        'VIDEOS',
      ];
      for (const tbl of oracleTables) {
        try {
          const res = await this.execute(`DELETE FROM ${tbl}`);
          count += res.rowsAffected || 0;
          await this.execute('COMMIT');
        } catch (err: any) {
          logger.warn(`Could not clear table ${tbl}`, { error: err?.message });
        }
      }
    }

    logger.info(`Operational database tables cleared cleanly (${count} records purged).`);
    return { cleared: tableKeys, count };
  }
}

export const db = new OracleDatabaseManager();

