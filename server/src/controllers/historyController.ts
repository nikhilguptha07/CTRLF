import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/searchService';
import { auditService } from '../services/auditService';
import { sendSuccess } from '../utils/response';

export class HistoryController {
  async getSearches(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, req.query.page ? parseInt(req.query.page as string, 10) : 1);
      const limit = Math.min(100, Math.max(1, req.query.limit ? parseInt(req.query.limit as string, 10) : 50));
      const history = await searchService.getSearchHistory(req.user!.userId, limit, req.user?.role);

      const totalCount = history.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));

      res.setHeader('X-Total-Count', totalCount.toString());
      res.setHeader('X-Page', page.toString());
      res.setHeader('X-Limit', limit.toString());
      res.setHeader('X-Total-Pages', totalPages.toString());

      return sendSuccess(res, history, 200);
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Audit logs are restricted to Administrators only.' },
        });
      }
      const page = Math.max(1, req.query.page ? parseInt(req.query.page as string, 10) : 1);
      const limit = Math.min(200, Math.max(1, req.query.limit ? parseInt(req.query.limit as string, 10) : 100));
      const logs = await auditService.getRecentLogs(limit);

      res.setHeader('X-Total-Count', logs.length.toString());
      res.setHeader('X-Page', page.toString());
      res.setHeader('X-Limit', limit.toString());
      res.setHeader('X-Total-Pages', Math.max(1, Math.ceil(logs.length / limit)).toString());

      return sendSuccess(res, logs, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const historyController = new HistoryController();
