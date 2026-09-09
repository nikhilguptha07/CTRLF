import { db } from '../config/database';
import { AuditLog } from '../types';

interface AuditRow {
  ID: string;
  USER_ID?: string | null;
  ACTION: string;
  RESOURCE_TYPE: string;
  RESOURCE_ID?: string | null;
  IP_ADDRESS?: string | null;
  USER_AGENT?: string | null;
  REQUEST_ID?: string | null;
  STATUS: string;
  DETAILS_JSON?: string | null;
  PREVIOUS_HASH?: string | null;
  CURRENT_HASH?: string | null;
  CREATED_AT: Date | string;
}

export class AuditRepository {
  private mapRow(row: AuditRow): AuditLog {
    return {
      id: row.ID,
      userId: row.USER_ID || null,
      action: row.ACTION,
      resourceType: row.RESOURCE_TYPE,
      resourceId: row.RESOURCE_ID || null,
      ipAddress: row.IP_ADDRESS || null,
      userAgent: row.USER_AGENT || null,
      requestId: row.REQUEST_ID || null,
      status: row.STATUS as 'SUCCESS' | 'FAILURE',
      detailsJson: row.DETAILS_JSON || null,
      previousHash: row.PREVIOUS_HASH || null,
      currentHash: row.CURRENT_HASH || null,
      createdAt: new Date(row.CREATED_AT),
    };
  }

  async create(log: Omit<AuditLog, 'createdAt'>): Promise<void> {
    const sql = `
      INSERT INTO AUDIT_LOGS (
        id, user_id, action, resource_type, resource_id,
        ip_address, user_agent, request_id, status, details_json,
        previous_hash, current_hash
      )
      VALUES (
        :id, :userId, :action, :resourceType, :resourceId,
        :ipAddress, :userAgent, :requestId, :status, :detailsJson,
        :previousHash, :currentHash
      )
    `;
    await db.execute(sql, {
      id: log.id,
      userId: log.userId || null,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId || null,
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
      requestId: log.requestId || null,
      status: log.status,
      detailsJson: log.detailsJson || null,
      previousHash: log.previousHash || null,
      currentHash: log.currentHash || null,
    });
  }

  async getLatestRecord(): Promise<AuditLog | null> {
    const sql = `
      SELECT id, user_id, action, resource_type, resource_id,
             ip_address, user_agent, request_id, status, details_json,
             previous_hash, current_hash, created_at
      FROM AUDIT_LOGS
      ORDER BY created_at DESC
      FETCH FIRST 1 ROWS ONLY
    `;
    const result = await db.execute<AuditRow>(sql);
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async getAllOrdered(): Promise<AuditLog[]> {
    const sql = `
      SELECT id, user_id, action, resource_type, resource_id,
             ip_address, user_agent, request_id, status, details_json,
             previous_hash, current_hash, created_at
      FROM AUDIT_LOGS
      ORDER BY created_at ASC
    `;
    const result = await db.execute<AuditRow>(sql);
    return (result.rows || []).map((r) => this.mapRow(r));
  }

  async findAll(limit = 100): Promise<AuditLog[]> {
    const sql = `
      SELECT id, user_id, action, resource_type, resource_id,
             ip_address, user_agent, request_id, status, details_json,
             previous_hash, current_hash, created_at
      FROM AUDIT_LOGS
      ORDER BY created_at DESC
      FETCH FIRST :limit ROWS ONLY
    `;
    const result = await db.execute<AuditRow>(sql, { limit });
    return (result.rows || []).map((row: AuditRow) => this.mapRow(row));
  }
}

export const auditRepository = new AuditRepository();
