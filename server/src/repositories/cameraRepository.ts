import { db } from '../config/database';
import { Camera, CameraSourceType, CameraStatus } from '../types/camera';

import { CameraProtocol, CameraCapabilities } from '../types/universalCamera';
import { CameraAdapterFactory } from '../adapters/camera/cameraAdapterFactory';

interface CameraRow {
  ID: string;
  USER_ID: string;
  NAME: string;
  LOCATION: string;
  PROTOCOL?: string;
  SOURCE_TYPE?: string;
  SOURCE_URI_ENCRYPTED?: string;
  RTSP_URL_ENCRYPTED?: string;
  ENABLED?: number;
  PRIORITY?: number;
  CALIBRATION_ID?: string | null;
  STATUS: string;
  CAPABILITIES?: string;
  PTZ_ENABLED?: number;
  DEVICE_INDEX?: number | null;
  LAST_CONNECTED_AT?: Date | string | null;
  CREATED_AT: Date | string;
  UPDATED_AT: Date | string;
}

const DEFAULT_CAMERAS_SEED: Array<Omit<Camera, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'CAM_01',
    userId: 'default',
    name: 'North Main Lobby // Desk Alpha',
    location: 'Zone Alpha - Primary Desk Feed',
    protocol: 'RTSP',
    sourceType: 'RTSP',
    sourceUriEncrypted: 'rtsp://127.0.0.1:8554/live/cam1',
    rtspUrlEncrypted: 'rtsp://127.0.0.1:8554/live/cam1',
    enabled: true,
    priority: 1,
    calibrationId: null,
    status: 'ONLINE',
    ptzEnabled: false,
  },
  {
    id: 'CAM_02',
    userId: 'default',
    name: 'Corridor A // PTZ Sweep',
    location: 'Zone Beta - North Corridor',
    protocol: 'ONVIF_PTZ',
    sourceType: 'ONVIF_PTZ',
    sourceUriEncrypted: 'rtsp://127.0.0.1:8554/live/cam2',
    rtspUrlEncrypted: 'rtsp://127.0.0.1:8554/live/cam2',
    enabled: true,
    priority: 2,
    calibrationId: null,
    status: 'ONLINE',
    ptzEnabled: true,
  },
  {
    id: 'CAM_03',
    userId: 'default',
    name: 'Access Checkpoint // USB-0',
    location: 'Zone Gamma - USB Hardware Feed',
    protocol: 'USB_WEBCAM',
    sourceType: 'USB_WEBCAM',
    sourceUriEncrypted: 'device://0',
    rtspUrlEncrypted: 'device://0',
    enabled: true,
    priority: 3,
    calibrationId: null,
    status: 'ONLINE',
    ptzEnabled: false,
    deviceIndex: 0,
  },
  {
    id: 'CAM_04',
    userId: 'default',
    name: 'Perimeter West // WebRTC Feed',
    location: 'Zone Delta - Main Portal',
    protocol: 'WEBRTC',
    sourceType: 'WEBRTC',
    sourceUriEncrypted: 'http://127.0.0.1:8889/cam4/whep',
    rtspUrlEncrypted: 'http://127.0.0.1:8889/cam4/whep',
    enabled: true,
    priority: 4,
    calibrationId: null,
    status: 'ONLINE',
    ptzEnabled: false,
  },
];

export class CameraRepository {
  private mapRowToCamera(row: CameraRow): Camera {
    const encUri = row.SOURCE_URI_ENCRYPTED || row.RTSP_URL_ENCRYPTED || '';
    const protocol = (row.PROTOCOL as CameraProtocol) || (row.SOURCE_TYPE as CameraProtocol) || 'RTSP';
    let capabilities: CameraCapabilities | undefined;
    if (row.CAPABILITIES) {
      try {
        capabilities = typeof row.CAPABILITIES === 'string' ? JSON.parse(row.CAPABILITIES) : row.CAPABILITIES;
      } catch {}
    }
    if (!capabilities) {
      const adapter = CameraAdapterFactory.createAdapter(protocol);
      capabilities = adapter.getCapabilities();
    }

    return {
      id: row.ID,
      userId: row.USER_ID,
      name: row.NAME,
      location: row.LOCATION,
      protocol,
      sourceType: (row.SOURCE_TYPE as CameraSourceType) || (protocol as any) || 'RTSP',
      sourceUriEncrypted: encUri,
      rtspUrlEncrypted: encUri,
      enabled: row.ENABLED === undefined || row.ENABLED === null ? true : Number(row.ENABLED) === 1,
      priority: row.PRIORITY ? Number(row.PRIORITY) : 1,
      calibrationId: row.CALIBRATION_ID || null,
      status: row.STATUS as CameraStatus,
      capabilities,
      ptzEnabled: row.PTZ_ENABLED !== undefined && row.PTZ_ENABLED !== null ? Number(row.PTZ_ENABLED) === 1 : Boolean(capabilities?.ptz),
      deviceIndex: row.DEVICE_INDEX !== undefined && row.DEVICE_INDEX !== null ? Number(row.DEVICE_INDEX) : null,
      lastConnectedAt: row.LAST_CONNECTED_AT ? new Date(row.LAST_CONNECTED_AT) : null,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
    };
  }

  async findById(id: string, userId?: string): Promise<Camera | null> {
    let sql = `
      SELECT id, user_id, name, location, protocol, source_type, source_uri_encrypted, rtsp_url_encrypted,
             enabled, priority, calibration_id, status, capabilities, ptz_enabled, device_index,
             last_connected_at, created_at, updated_at
      FROM CAMERAS
      WHERE id = :id
    `;
    const binds: Record<string, unknown> = { id };

    if (userId) {
      sql += ` AND user_id = :userId`;
      binds.userId = userId;
    }

    const result = await db.execute<CameraRow>(sql, binds);
    if (!result.rows || result.rows.length === 0) {
      const defaultSeed = DEFAULT_CAMERAS_SEED.find((c) => c.id === id);
      if (defaultSeed) {
        const adapter = CameraAdapterFactory.createAdapter(defaultSeed.protocol || 'RTSP');
        return {
          ...defaultSeed,
          capabilities: adapter.getCapabilities(),
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date(),
        };
      }
      return null;
    }
    return this.mapRowToCamera(result.rows[0]);
  }

  async findAllByUserId(userId: string): Promise<Camera[]> {
    const sql = `
      SELECT id, user_id, name, location, protocol, source_type, source_uri_encrypted, rtsp_url_encrypted,
             enabled, priority, calibration_id, status, capabilities, ptz_enabled, device_index,
             last_connected_at, created_at, updated_at
      FROM CAMERAS
      WHERE user_id = :userId
      ORDER BY priority ASC, created_at DESC
    `;
    const result = await db.execute<CameraRow>(sql, { userId });
    const rows = (result.rows || []).map((row: CameraRow) => this.mapRowToCamera(row));
    if (rows.length === 0) {
      return DEFAULT_CAMERAS_SEED.map((c) => {
        const adapter = CameraAdapterFactory.createAdapter(c.protocol || 'RTSP');
        return {
          ...c,
          capabilities: adapter.getCapabilities(),
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date(),
        };
      });
    }
    return rows;
  }

  async findAll(enabledOnly = false): Promise<Camera[]> {
    let sql = `
      SELECT id, user_id, name, location, protocol, source_type, source_uri_encrypted, rtsp_url_encrypted,
             enabled, priority, calibration_id, status, capabilities, ptz_enabled, device_index,
             last_connected_at, created_at, updated_at
      FROM CAMERAS
    `;
    const binds: Record<string, unknown> = {};
    if (enabledOnly) {
      sql += ` WHERE enabled = :enabled`;
      binds.enabled = 1;
    }
    sql += ` ORDER BY priority ASC, created_at ASC`;
    const result = await db.execute<CameraRow>(sql, binds);
    const rows = (result.rows || []).map((row: CameraRow) => this.mapRowToCamera(row));
    if (rows.length === 0) {
      return DEFAULT_CAMERAS_SEED.map((c) => {
        const adapter = CameraAdapterFactory.createAdapter(c.protocol || 'RTSP');
        return {
          ...c,
          capabilities: adapter.getCapabilities(),
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date(),
        };
      });
    }
    return rows;
  }

  async create(camera: Omit<Camera, 'createdAt' | 'updatedAt'>): Promise<Camera> {
    const encUri = camera.sourceUriEncrypted || camera.rtspUrlEncrypted || '';
    const protocol = camera.protocol || (camera.sourceType as CameraProtocol) || 'RTSP';
    const capabilities = camera.capabilities || CameraAdapterFactory.createAdapter(protocol).getCapabilities();
    const ptzEnabled = camera.ptzEnabled !== undefined ? (camera.ptzEnabled ? 1 : 0) : (capabilities.ptz ? 1 : 0);

    const sql = `
      INSERT INTO CAMERAS (
        id, user_id, name, location, protocol, source_type, source_uri_encrypted,
        rtsp_url_encrypted, enabled, priority, calibration_id, status,
        capabilities, ptz_enabled, device_index
      ) VALUES (
        :id, :userId, :name, :location, :protocol, :sourceType, :sourceUriEncrypted,
        :rtspUrlEncrypted, :enabled, :priority, :calibrationId, :status,
        :capabilities, :ptzEnabled, :deviceIndex
      )
    `;
    await db.execute(sql, {
      id: camera.id,
      userId: camera.userId,
      name: camera.name,
      location: camera.location,
      protocol,
      sourceType: camera.sourceType || (protocol as any) || 'RTSP',
      sourceUriEncrypted: encUri,
      rtspUrlEncrypted: encUri,
      enabled: camera.enabled ? 1 : 0,
      priority: camera.priority || 1,
      calibrationId: camera.calibrationId || null,
      status: camera.status || 'OFFLINE',
      capabilities: JSON.stringify(capabilities),
      ptzEnabled,
      deviceIndex: camera.deviceIndex !== undefined ? camera.deviceIndex : null,
    });

    const created = await this.findById(camera.id);
    if (!created) {
      throw new Error('Camera creation failed');
    }
    return created;
  }

  async update(
    id: string,
    userId: string,
    updates: Partial<Pick<Camera, 'name' | 'location' | 'sourceType' | 'sourceUriEncrypted' | 'rtspUrlEncrypted' | 'enabled' | 'priority' | 'calibrationId' | 'status' | 'lastConnectedAt'>>
  ): Promise<Camera | null> {
    const fields: string[] = [];
    const binds: Record<string, unknown> = { id, userId };

    if (updates.name !== undefined) {
      fields.push('name = :name');
      binds.name = updates.name;
    }
    if (updates.location !== undefined) {
      fields.push('location = :location');
      binds.location = updates.location;
    }
    if (updates.sourceType !== undefined) {
      fields.push('source_type = :sourceType');
      binds.sourceType = updates.sourceType;
    }
    if (updates.sourceUriEncrypted !== undefined) {
      fields.push('source_uri_encrypted = :sourceUriEncrypted');
      fields.push('rtsp_url_encrypted = :rtspUrlEncrypted');
      binds.sourceUriEncrypted = updates.sourceUriEncrypted;
      binds.rtspUrlEncrypted = updates.sourceUriEncrypted;
    } else if (updates.rtspUrlEncrypted !== undefined) {
      fields.push('rtsp_url_encrypted = :rtspUrlEncrypted');
      fields.push('source_uri_encrypted = :sourceUriEncrypted');
      binds.rtspUrlEncrypted = updates.rtspUrlEncrypted;
      binds.sourceUriEncrypted = updates.rtspUrlEncrypted;
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = :enabled');
      binds.enabled = updates.enabled ? 1 : 0;
    }
    if (updates.priority !== undefined) {
      fields.push('priority = :priority');
      binds.priority = updates.priority;
    }
    if (updates.calibrationId !== undefined) {
      fields.push('calibration_id = :calibrationId');
      binds.calibrationId = updates.calibrationId;
    }
    if (updates.status !== undefined) {
      fields.push('status = :status');
      binds.status = updates.status;
    }
    if (updates.lastConnectedAt !== undefined) {
      fields.push('last_connected_at = :lastConnectedAt');
      binds.lastConnectedAt = updates.lastConnectedAt;
    }

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `
      UPDATE CAMERAS
      SET ${fields.join(', ')}
      WHERE id = :id AND user_id = :userId
    `;

    await db.execute(sql, binds);
    return this.findById(id, userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const sql = `
      DELETE FROM CAMERAS
      WHERE id = :id AND user_id = :userId
    `;
    const result = await db.execute(sql, { id, userId });
    return (result.rowsAffected || 0) > 0;
  }
}

export const cameraRepository = new CameraRepository();
