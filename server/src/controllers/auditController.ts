import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';
import { sendSuccess, sendError } from '../utils/response';

export class AuditController {
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const logs = await auditService.getRecentLogs(Math.min(limit, 500));
      return sendSuccess(res, logs);
    } catch (err) {
      next(err);
    }
  }

  async verifyChain(_req: Request, res: Response, next: NextFunction) {
    try {
      const verification = await auditService.verifyAuditChain();
      return sendSuccess(res, {
        verified: verification.valid,
        chainValid: verification.valid,
        totalBlocks: verification.verifiedCount,
        status: verification.valid ? 'VALID' : 'TAMPERED',
        verifiedCount: verification.verifiedCount,
        tamperedRecordId: verification.tamperedRecordId,
        reason: verification.reason || null,
        message: verification.valid ? 'Audit hash chain intact and verified.' : 'Hash mismatch detected.',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async recordEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, resourceType, resourceId, details, status } = req.body;
      if (!action || !resourceType) {
        return sendError(res, 'VALIDATION_ERROR', 'Action and resourceType are required', 400);
      }

      const log = await auditService.record({
        userId: req.user?.userId || 'OPERATOR',
        action,
        resourceType,
        resourceId: resourceId || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
        status: status || 'SUCCESS',
        details: details || null,
      });

      return sendSuccess(res, log, 201);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
