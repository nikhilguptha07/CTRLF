import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/searchService';
import { auditService } from '../services/auditService';
import { sendSuccess } from '../utils/response';

export class HistoryController {
  async getSearches(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = await searchService.getSearchHistory(req.user!.userId, limit);
      return sendSuccess(res, history, 200);
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const logs = await auditService.getRecentLogs(limit);
      return sendSuccess(res, logs, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const historyController = new HistoryController();
