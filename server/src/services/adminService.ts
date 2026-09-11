import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { env } from '../config/env';
import { userRepository } from '../repositories/userRepository';
import { cameraRepository } from '../repositories/cameraRepository';
import { searchRepository } from '../repositories/searchRepository';
import { detectionRepository } from '../repositories/detectionRepository';
import { auditRepository } from '../repositories/auditRepository';
import { auditService } from './auditService';
import { AppError } from '../middleware/errorHandler';
import { User, UserRole } from '../types/user';
import { Camera } from '../types/camera';

const APPROVED_TABLES = [
  'USERS',
  'CAMERAS',
  'VIDEOS',
  'SEARCH_SESSIONS',
  'SEARCH_TARGETS',
  'DETECTIONS',
  'OBJECT_TRACKS',
  'SEARCH_RESULTS',
  'CAMERA_STREAM_STATUS',
  'AUDIT_LOGS',
] as const;

export class AdminService {
  /**
   * Real KPI metrics for Admin Overview Dashboard
   */
  async getOverviewStats(): Promise<Record<string, unknown>> {
    const startPing = performance.now();
    let isDbHealthy = false;
    try {
      const res = await db.execute('SELECT 1 FROM DUAL');
      isDbHealthy = Array.isArray(res.rows) && res.rows.length > 0;
    } catch {
      isDbHealthy = false;
    }
    const latencyMs = Math.max(1, Math.round(performance.now() - startPing));

    const users = await userRepository.findAll(1000);
    const cameras = await cameraRepository.findAll();
    const activeCameras = cameras.filter((c) => c.status === 'ONLINE' && c.enabled);
    const totalSessions = await searchRepository.countTotalSessions();
    const totalDetections = await detectionRepository.countTotal();
    const totalTracks = await searchRepository.countTotalTracks();
    const auditLogs = await auditRepository.findAll(1000);

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      activeCameras: activeCameras.length,
      totalCameras: cameras.length,
      searchSessions: totalSessions,
      totalDetections,
      objectTracks: totalTracks,
      auditEvents: auditLogs.length,
      databaseStatus: isDbHealthy ? (db.isMock() ? 'CONNECTED_FALLBACK' : 'CONNECTED') : 'DEGRADED',
      systemHealth: isDbHealthy ? 'HEALTHY' : 'DEGRADED',
      oracleMode: db.isMock() ? 'OFFLINE_IN_MEMORY' : 'ORACLE_21C_XE_THIN',
      databaseVersion: '21c XE',
      databaseName: env.ORACLE_SERVICE_NAME || 'XEPDB1',
      latencyMs,
      lastHealthCheck: new Date().toISOString(),
    };
  }

  /**
   * Safe Oracle 21c XE Database Details and Table Row Counts (NO SECRETS)
   */
  async getDatabaseMetadata(): Promise<Record<string, unknown>> {
    const startPing = performance.now();
    let isDbHealthy = false;
    try {
      const res = await db.execute('SELECT 1 FROM DUAL');
      isDbHealthy = Array.isArray(res.rows) && res.rows.length > 0;
    } catch {
      isDbHealthy = false;
    }
    const latencyMs = Math.max(1, Math.round(performance.now() - startPing));

    // Calculate real record counts for each approved table
    const tableStats = await Promise.all(
      APPROVED_TABLES.map(async (table) => {
        let count = 0;
        try {
          if (db.isMock()) {
            const inMem = (db as any).getInMemoryStore?.() || {};
            const key = table.toLowerCase();
            if (inMem[key]) {
              count = inMem[key].length;
            } else if (key === 'users') {
              count = inMem.users?.length || 0;
            } else if (key === 'cameras') {
              count = inMem.cameras?.length || 0;
            } else if (key === 'search_sessions') {
              count = inMem.search_sessions?.length || 0;
            } else if (key === 'detections') {
              count = inMem.detections?.length || inMem.detection_results?.length || 0;
            } else if (key === 'object_tracks') {
              count = inMem.object_tracks?.length || 0;
            } else if (key === 'audit_logs') {
              count = inMem.audit_logs?.length || 0;
            } else if (key === 'videos' || key === 'video_files') {
              count = inMem.videos?.length || inMem.video_files?.length || 0;
            } else if (key === 'search_targets') {
              count = inMem.search_targets?.length || 0;
            } else if (key === 'search_results') {
              count = inMem.search_results?.length || 0;
            } else if (key === 'camera_stream_status' || key === 'camera_events') {
              count = inMem.camera_stream_status?.length || inMem.camera_events?.length || 0;
            }
          } else {
            const res = await db.execute<any>(`SELECT COUNT(*) AS CNT FROM ${table}`);
            count = Number(res.rows?.[0]?.CNT || res.rows?.[0]?.COUNT || 0);
          }
        } catch {
          count = 0;
        }

        const descriptions: Record<string, string> = {
          USERS: 'Operator accounts, security roles, and authentication state',
          CAMERAS: 'Surveillance hardware streams, RTSP links, and PTZ controllers',
          VIDEOS: 'Forensic footage recordings and optical source files',
          VIDEO_FILES: 'Forensic footage recordings and optical source files',
          SEARCH_SESSIONS: 'Temporal object search sessions and tracking queries',
          SEARCH_TARGETS: 'Semantic target classes, color specifications, and labels',
          DETECTIONS: 'YOLOv8 bounding boxes, confidence ratings, and timestamps',
          OBJECT_TRACKS: 'ByteTrack persistent multi-frame spatial trajectories',
          SEARCH_RESULTS: 'Final verified search conclusions and forensic evidence',
          CAMERA_STREAM_STATUS: 'Real-time camera streaming health and status telemetry',
          CAMERA_EVENTS: 'Hardware heartbeat, connection drops, and reconnect events',
          AUDIT_LOGS: 'Immutable SHA-256 tamper-evident security audit trail',
        };

        return {
          name: table,
          recordCount: count,
          description: descriptions[table] || 'Application table',
        };
      })
    );

    return {
      connectionStatus: isDbHealthy ? (db.isMock() ? 'CONNECTED_FALLBACK' : 'CONNECTED') : 'DEGRADED',
      databaseName: env.ORACLE_SERVICE_NAME || 'XEPDB1',
      pdbService: env.ORACLE_SERVICE_NAME || 'XEPDB1',
      serverStatus: 'ONLINE',
      databaseVersion: '21c XE',
      thinMode: true,
      lastHealthCheck: new Date().toISOString(),
      latencyMs,
      poolConfig: {
        poolMin: env.ORACLE_POOL_MIN || 2,
        poolMax: env.ORACLE_POOL_MAX || 10,
        poolIncrement: env.ORACLE_POOL_INCREMENT || 1,
        poolTimeout: env.ORACLE_POOL_TIMEOUT || 60,
      },
      tables: tableStats,
    };
  }

  /**
   * User Management (List with search/filter)
   */
  async getUsers(params: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const allUsers = await userRepository.findAll(1000);

    let filtered = allUsers.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.isActive ? 'ACTIVE' : 'DISABLED',
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.fullName || '').toLowerCase().includes(q)
      );
    }

    if (params.role) {
      filtered = filtered.filter((u) => u.role.toUpperCase() === params.role!.toUpperCase());
    }

    if (params.status) {
      filtered = filtered.filter((u) => u.status.toUpperCase() === params.status!.toUpperCase());
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      users: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Create User via Admin
   */
  async createUser(
    data: { username?: string; email: string; fullName: string; password: string; role?: UserRole },
    adminUser: any
  ) {
    if (!data.email || !data.password || !data.fullName) {
      throw new AppError('VALIDATION_ERROR', 'Email, password, and full name are required', 400);
    }

    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('EMAIL_EXISTS', 'A user with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const userId = uuidv4();
    const role: UserRole = data.role || 'OPERATOR';
    const username = data.username || data.email.split('@')[0].toLowerCase();

    const created = await userRepository.create({
      id: userId,
      username,
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash,
      role,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
    });

    await auditService.record({
      userId: adminUser.userId,
      action: 'ADMIN_USER_CREATED',
      resourceType: 'USER',
      resourceId: userId,
      status: 'SUCCESS',
      details: {
        createdUserId: userId,
        email: created.email,
        role: created.role,
        adminEmail: adminUser.email,
      },
    });

    return {
      id: created.id,
      username: created.username,
      email: created.email,
      fullName: created.fullName,
      role: created.role,
      status: created.isActive ? 'ACTIVE' : 'DISABLED',
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Update User (Role or Active status) with final-admin protection
   */
  async updateUser(
    id: string,
    updates: { role?: UserRole; isActive?: boolean; fullName?: string; password?: string },
    adminUser: any
  ) {
    const targetUser = await userRepository.findById(id);
    if (!targetUser) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    // Safety guard: Do not allow removing or disabling the last active admin
    if (targetUser.role === 'ADMIN') {
      const isDemoting = updates.role && updates.role !== 'ADMIN';
      const isDisabling = updates.isActive === false;

      if (isDemoting || isDisabling) {
        const totalActiveAdmins = await userRepository.countAdmins();
        if (totalActiveAdmins <= 1) {
          throw new AppError(
            'LAST_ADMIN_PROTECTION',
            'Cannot demote or disable the last remaining Administrator account. Create another Admin first.',
            400
          );
        }
      }
    }

    const payload: Parameters<typeof userRepository.updateUser>[1] = {};
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.isActive !== undefined) payload.isActive = updates.isActive;
    if (updates.fullName !== undefined) payload.fullName = updates.fullName;
    if (updates.password) {
      payload.passwordHash = await bcrypt.hash(updates.password, 12);
    }

    const updated = await userRepository.updateUser(id, payload);
    if (!updated) {
      throw new AppError('UPDATE_FAILED', 'Failed to update user', 500);
    }

    await auditService.record({
      userId: adminUser.userId,
      action: 'ADMIN_USER_UPDATED',
      resourceType: 'USER',
      resourceId: id,
      status: 'SUCCESS',
      details: {
        targetEmail: updated.email,
        changes: updates,
        adminEmail: adminUser.email,
      },
    });

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      status: updated.isActive ? 'ACTIVE' : 'DISABLED',
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Camera Management
   */
  async getCameras(params: { search?: string; status?: string; page?: number; limit?: number }) {
    const all = await cameraRepository.findAll();

    let filtered = all.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      protocol: c.protocol || c.sourceType,
      status: c.status,
      enabled: c.enabled,
      priority: c.priority,
      ptzEnabled: c.ptzEnabled,
      lastConnectedAt: c.lastConnectedAt ? new Date(c.lastConnectedAt).toISOString() : null,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
    }));

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      );
    }

    if (params.status) {
      filtered = filtered.filter((c) => c.status.toUpperCase() === params.status!.toUpperCase());
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const total = filtered.length;
    const startIndex = (page - 1) * limit;

    return {
      cameras: filtered.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createCamera(
    data: { id?: string; name: string; location: string; protocol?: string; uri?: string; priority?: number },
    adminUser: any
  ) {
    if (!data.name || !data.location) {
      throw new AppError('VALIDATION_ERROR', 'Camera name and location are required', 400);
    }

    const camId = data.id || `CAM_${Date.now().toString(36).toUpperCase()}`;
    const newCamera: Omit<Camera, 'createdAt' | 'updatedAt'> = {
      id: camId,
      userId: adminUser.userId,
      name: data.name,
      location: data.location,
      protocol: (data.protocol as any) || 'RTSP',
      sourceType: (data.protocol as any) || 'RTSP',
      sourceUriEncrypted: data.uri || 'rtsp://127.0.0.1:8554/live/stream',
      rtspUrlEncrypted: data.uri || 'rtsp://127.0.0.1:8554/live/stream',
      enabled: true,
      priority: Number(data.priority || 1),
      status: 'ONLINE',
      ptzEnabled: false,
    };

    const created = await cameraRepository.create(newCamera);

    await auditService.record({
      userId: adminUser.userId,
      action: 'ADMIN_CAMERA_CREATED',
      resourceType: 'CAMERA',
      resourceId: created.id,
      status: 'SUCCESS',
      details: { cameraName: created.name, location: created.location, adminEmail: adminUser.email },
    });

    return created;
  }

  async updateCamera(id: string, updates: Partial<Camera>, adminUser: any) {
    const existing = await cameraRepository.findById(id);
    if (!existing) {
      throw new AppError('CAMERA_NOT_FOUND', 'Camera not found', 404);
    }

    const updated = await cameraRepository.update(id, adminUser.userId, updates);

    await auditService.record({
      userId: adminUser.userId,
      action: 'ADMIN_CAMERA_UPDATED',
      resourceType: 'CAMERA',
      resourceId: id,
      status: 'SUCCESS',
      details: { changes: updates, adminEmail: adminUser.email },
    });

    return updated;
  }

  /**
   * Search Sessions
   */
  async getSearchSessions(params: { search?: string; status?: string; source?: string; page?: number; limit?: number }) {
    const all = await searchRepository.findAll(500);

    let filtered = all.map((s) => ({
      id: s.id,
      sessionId: s.id,
      target: s.objectName,
      source: s.sourceType,
      sourceId: s.sourceId,
      status: s.status,
      progressPercent: s.progressPercent,
      errorMessage: s.errorMessage,
      startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
      completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : null,
    }));

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((s) => s.target.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }

    if (params.status) {
      filtered = filtered.filter((s) => s.status.toUpperCase() === params.status!.toUpperCase());
    }

    if (params.source) {
      filtered = filtered.filter((s) => s.source.toUpperCase() === params.source!.toUpperCase());
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const total = filtered.length;
    const startIndex = (page - 1) * limit;

    return {
      sessions: filtered.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSearchSessionDetail(sessionId: string) {
    const session = await searchRepository.findById(sessionId);
    if (!session) {
      throw new AppError('SESSION_NOT_FOUND', 'Search session not found', 404);
    }

    const target = await searchRepository.findTargetBySearchId(sessionId);
    const tracks = await searchRepository.findTracksBySearchId(sessionId);
    const events = await searchRepository.findEventsBySearchId(sessionId);
    const detections = await detectionRepository.findDetectionsBySearchId(sessionId);
    const result = await searchRepository.findResultBySearchId(sessionId);

    return {
      session,
      target,
      tracks,
      events,
      detections,
      result,
    };
  }

  /**
   * Detection Records
   */
  async getDetections(params: { search?: string; camera?: string; session?: string; page?: number; limit?: number }) {
    const all = await detectionRepository.findAll(500);

    let filtered = all.map((d) => ({
      detectionId: d.detectionId,
      object: d.objectName,
      confidence: d.confidence,
      trackId: d.boundingBox ? (d as any).trackId || `TRK-${d.frameNumber}` : 'N/A',
      frame: d.frameNumber,
      timestamp: `${d.timestampSeconds.toFixed(2)}s`,
      timestampSeconds: d.timestampSeconds,
      camera: d.cameraId || 'N/A',
      session: d.searchId || 'N/A',
      hasImage: d.hasImage,
      boundingBox: d.boundingBox,
      detectedAt: d.createdAt ? d.createdAt.toISOString() : null,
      status: d.detectionStatus,
    }));

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.object.toLowerCase().includes(q) ||
          String(d.detectionId).toLowerCase().includes(q) ||
          String(d.camera).toLowerCase().includes(q)
      );
    }

    if (params.camera) {
      filtered = filtered.filter((d) => String(d.camera).toLowerCase() === params.camera!.toLowerCase());
    }

    if (params.session) {
      filtered = filtered.filter((d) => String(d.session).toLowerCase() === params.session!.toLowerCase());
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const total = filtered.length;
    const startIndex = (page - 1) * limit;

    return {
      detections: filtered.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDetectionDetail(detectionId: string | number) {
    const detection = await detectionRepository.findDetectionById(detectionId);
    if (!detection) {
      throw new AppError('DETECTION_NOT_FOUND', 'Detection record not found', 404);
    }
    return detection;
  }

  /**
   * Object Tracks
   */
  async getTracks(params: { search?: string; camera?: string; session?: string; page?: number; limit?: number }) {
    const all = await searchRepository.findAllTracks(500);

    let filtered = all.map((t) => ({
      id: t.id,
      trackId: t.trackId ? `TRK-${t.trackId}` : String(t.id),
      rawTrackId: t.trackId,
      object: t.className,
      color: t.dominantColor || 'N/A',
      confidence: t.confidence,
      frameIndex: t.frameIndex,
      timestampMs: t.timestampMs,
      status: t.status,
      searchId: t.searchId,
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
    }));

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.object.toLowerCase().includes(q) ||
          t.trackId.toLowerCase().includes(q) ||
          String(t.color).toLowerCase().includes(q)
      );
    }

    if (params.session) {
      filtered = filtered.filter((t) => String(t.searchId).toLowerCase() === params.session!.toLowerCase());
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const total = filtered.length;
    const startIndex = (page - 1) * limit;

    return {
      tracks: filtered.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Audit Logs
   */
  async getAuditLogs(params: { search?: string; action?: string; status?: string; page?: number; limit?: number }) {
    const all = await auditRepository.findAll(500);
    const verification = await auditService.verifyAuditChain();

    let filtered = all.map((l) => ({
      id: l.id,
      timestamp: l.createdAt.toISOString(),
      user: l.userId || 'SYSTEM',
      action: l.action,
      resource: `${l.resourceType}${l.resourceId ? ` // ${l.resourceId}` : ''}`,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      status: l.status,
      requestId: l.requestId || 'N/A',
      ipAddress: l.ipAddress || 'N/A',
      currentHash: l.currentHash,
      details: l.detailsJson ? (typeof l.detailsJson === 'string' ? JSON.parse(l.detailsJson) : l.detailsJson) : null,
    }));

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.user.toLowerCase().includes(q) ||
          l.resource.toLowerCase().includes(q) ||
          l.requestId.toLowerCase().includes(q)
      );
    }

    if (params.action) {
      filtered = filtered.filter((l) => l.action.toUpperCase() === params.action!.toUpperCase());
    }

    if (params.status) {
      filtered = filtered.filter((l) => l.status.toUpperCase() === params.status!.toUpperCase());
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const total = filtered.length;
    const startIndex = (page - 1) * limit;

    return {
      logs: filtered.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      chainVerification: verification,
    };
  }

  /**
   * Generic Approved Database Table Explorer
   * Strictly enforces whitelist against arbitrary SQL injection
   */
  async getTableData(tableName: string, page = 1, limit = 20, search = '') {
    const tableUpper = tableName.toUpperCase();
    if (!APPROVED_TABLES.includes(tableUpper as any)) {
      throw new AppError(
        'FORBIDDEN_TABLE',
        `Table '${tableName}' is not accessible. Allowed tables: ${APPROVED_TABLES.join(', ')}`,
        400
      );
    }

    let rows: Record<string, unknown>[] = [];
    let columns: string[] = [];

    if (db.isMock()) {
      const inMem = (db as any).getInMemoryStore?.() || {};
      const key = tableUpper.toLowerCase();
      let rawRows: Record<string, unknown>[] = inMem[key] || inMem[tableUpper] || [];
      if (!rawRows.length) {
        // Aliases
        if (tableUpper === 'VIDEO_FILES') rawRows = inMem.videos || [];
        if (tableUpper === 'DETECTIONS') rawRows = inMem.detections || inMem.detection_results || [];
      }
      rows = [...rawRows];
    } else {
      const res = await db.execute<any>(`SELECT * FROM ${tableUpper}`);
      rows = (res.rows || []) as Record<string, unknown>[];
    }

    // Sanitize sensitive columns
    rows = rows.map((r) => {
      const sanitized = { ...r };
      delete sanitized.PASSWORD_HASH;
      delete sanitized.passwordHash;
      delete sanitized.REFRESH_TOKEN_HASH;
      delete sanitized.refreshTokenHash;
      delete sanitized.ENCRYPTED_PASSWORD;
      delete sanitized.encryptedPassword;
      return sanitized;
    });

    if (rows.length > 0) {
      columns = Object.keys(rows[0]);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((val) => String(val ?? '').toLowerCase().includes(q))
      );
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const total = rows.length;
    const startIndex = (safePage - 1) * safeLimit;
    const paginated = rows.slice(startIndex, startIndex + safeLimit);

    return {
      tableName: tableUpper,
      columns,
      rows: paginated,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }
}

export const adminService = new AdminService();
