import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { sendSuccess } from '../utils/response';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getProfile(req.user!.userId);
      return sendSuccess(res, profile, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
