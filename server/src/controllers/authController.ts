import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await authService.register(
        req.body,
        req.ip,
        req.headers['user-agent'],
        req.id
      );

      res.cookie('accessToken', tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return sendSuccess(res, tokens, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await authService.login(
        req.body,
        req.ip,
        req.headers['user-agent'],
        req.id
      );

      const rememberMe = Boolean(req.body.rememberMe);
      const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

      res.cookie('accessToken', tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: refreshMaxAge,
      });

      return sendSuccess(res, tokens, 200);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.body.refreshToken || req.cookies?.refreshToken;
      if (!token) {
        return sendError(res, 'TOKEN_REQUIRED', 'Refresh token is required', 401);
      }

      const newTokens = await authService.refreshToken(token, req.id);

      res.cookie('accessToken', newTokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', newTokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return sendSuccess(res, newTokens, 200);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.userId) {
        await authService.logout(req.user.userId, req.id);
      }
      res.clearCookie('refreshToken', COOKIE_OPTIONS);
      res.clearCookie('accessToken', COOKIE_OPTIONS);
      return sendSuccess(res, { message: 'Logged out successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }
      const profile = await authService.getMe(req.user.userId);
      return sendSuccess(res, profile, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
