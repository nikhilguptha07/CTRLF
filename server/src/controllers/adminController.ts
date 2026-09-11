import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService';
import { sendSuccess } from '../utils/response';

export class AdminController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getOverviewStats();
      return sendSuccess(res, stats, 200);
    } catch (err) {
      next(err);
    }
  }

  async getDatabase(req: Request, res: Response, next: NextFunction) {
    try {
      const dbInfo = await adminService.getDatabaseMetadata();
      return sendSuccess(res, dbInfo, 200);
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, role, status, page, limit } = req.query;
      const data = await adminService.getUsers({
        search: search as string,
        role: role as string,
        status: status as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await adminService.createUser(req.body, req.user);
      return sendSuccess(res, created, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await adminService.updateUser(id, req.body, req.user);
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async getCameras(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, page, limit } = req.query;
      const data = await adminService.getCameras({
        search: search as string,
        status: status as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  async createCamera(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await adminService.createCamera(req.body, req.user);
      return sendSuccess(res, created, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateCamera(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await adminService.updateCamera(id, req.body, req.user);
      return sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async getSearchSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, source, page, limit } = req.query;
      const data = await adminService.getSearchSessions({
        search: search as string,
        status: status as string,
        source: source as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  async getSearchSessionDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const detail = await adminService.getSearchSessionDetail(id);
      return sendSuccess(res, detail, 200);
    } catch (err) {
      next(err);
    }
  }

  async getDetections(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, camera, session, page, limit } = req.query;
      const data = await adminService.getDetections({
        search: search as string,
        camera: camera as string,
        session: session as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  async getDetectionDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const detail = await adminService.getDetectionDetail(id);
      return sendSuccess(res, detail, 200);
    } catch (err) {
      next(err);
    }
  }

  async getTracks(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, camera, session, page, limit } = req.query;
      const data = await adminService.getTracks({
        search: search as string,
        camera: camera as string,
        session: session as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, action, status, page, limit } = req.query;
      const data = await adminService.getAuditLogs({
        search: search as string,
        action: action as string,
        status: status as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  async getTableData(req: Request, res: Response, next: NextFunction) {
    try {
      const { tableName } = req.params;
      const { page, limit, search } = req.query;
      const data = await adminService.getTableData(
        tableName,
        page ? Number(page) : undefined,
        limit ? Number(limit) : undefined,
        search as string
      );
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
