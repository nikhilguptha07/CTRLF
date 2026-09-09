import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';
import { sendSuccess } from '../utils/response';

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
        status: verification.valid ? 'VALID' : 'TAMPERED',
        verifiedCount: verification.verifiedCount,
        tamperedRecordId: verification.tamperedRecordId,
        reason: verification.reason || null,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
