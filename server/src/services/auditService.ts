import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { auditRepository } from '../repositories/auditRepository';
import { logger } from '../utils/logger';
import { AuditLog } from '../types';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface RecordAuditParams {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  status: 'SUCCESS' | 'FAILURE';
  details?: Record<string, unknown> | null;
}

export interface AuditVerificationResult {
  valid: boolean;
  verifiedCount: number;
  tamperedRecordId: string | null;
  reason?: string | null;
}

export class AuditService {
  /**
   * Computes deterministic cryptographic SHA-256 hash for tamper-evident chain
   */
  public computeHash(previousHash: string, log: {
    id: string;
    userId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    status: string;
    detailsJson: string | null;
  }): string {
    const canonicalPayload = [
      previousHash,
      log.id,
      log.userId || '',
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.status,
      log.detailsJson || '',
    ].join(':');

    return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
  }

  async record(params: RecordAuditParams): Promise<AuditLog | null> {
    try {
      const id = uuidv4();
      const latest = await auditRepository.getLatestRecord();
      const previousHash = latest?.currentHash || GENESIS_HASH;
      const detailsJson = params.details ? JSON.stringify(params.details) : null;

      const currentHash = this.computeHash(previousHash, {
        id,
        userId: params.userId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        status: params.status,
        detailsJson,
      });

      const logRecord: Omit<AuditLog, 'createdAt'> = {
        id,
        userId: params.userId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestId: params.requestId || null,
        status: params.status,
        detailsJson,
        previousHash,
        currentHash,
      };

      await auditRepository.create(logRecord);

      logger.info(`Audit logged: ${params.action} [${params.status}]`, {
        userId: params.userId || undefined,
        resourceType: params.resourceType,
        resourceId: params.resourceId || undefined,
        requestId: params.requestId || undefined,
        currentHash: currentHash.substring(0, 12) + '...',
      });

      return {
        ...logRecord,
        createdAt: new Date(),
      };
    } catch (err) {
      logger.error('Failed to write cryptographic audit log', err, { action: params.action });
      return null;
    }
  }

  async getRecentLogs(limit = 100): Promise<AuditLog[]> {
    return auditRepository.findAll(limit);
  }

  /**
   * Cryptographic verification of the tamper-evident hash chain from genesis to head
   */
  async verifyAuditChain(): Promise<AuditVerificationResult> {
    const records = await auditRepository.getAllOrdered();

    if (records.length === 0) {
      return {
        valid: true,
        verifiedCount: 0,
        tamperedRecordId: null,
      };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];

      // 1. Verify previous hash pointer
      if (i === 0) {
        if (rec.previousHash && rec.previousHash !== GENESIS_HASH) {
          // If genesis record had a previousHash recorded, check it
          expectedPrevHash = rec.previousHash;
        }
      } else {
        if (rec.previousHash !== expectedPrevHash) {
          return {
            valid: false,
            verifiedCount: i,
            tamperedRecordId: rec.id,
            reason: `Broken chain link at index ${i}: expected previousHash ${expectedPrevHash.substring(0, 12)}... but got ${rec.previousHash?.substring(0, 12)}...`,
          };
        }
      }

      // 2. Re-compute SHA-256
      const computed = this.computeHash(rec.previousHash || GENESIS_HASH, {
        id: rec.id,
        userId: rec.userId || null,
        action: rec.action,
        resourceType: rec.resourceType,
        resourceId: rec.resourceId || null,
        status: rec.status,
        detailsJson: rec.detailsJson || null,
      });

      if (rec.currentHash !== computed) {
        return {
          valid: false,
          verifiedCount: i,
          tamperedRecordId: rec.id,
          reason: `Payload hash mismatch at record ${rec.id}: stored hash ${rec.currentHash?.substring(0, 12)}... does not match computed ${computed.substring(0, 12)}...`,
        };
      }

      expectedPrevHash = rec.currentHash;
    }

    return {
      valid: true,
      verifiedCount: records.length,
      tamperedRecordId: null,
    };
  }
}

export const auditService = new AuditService();
