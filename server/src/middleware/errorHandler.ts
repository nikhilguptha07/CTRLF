import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const requestId = req.id;

  if (err instanceof AppError || (err as any).statusCode || (err as any).code) {
    const statusCode = (err as any).statusCode || 400;
    const code = (err as any).code || 'BAD_REQUEST';
    logger.warn(`Handled application error: ${err.message}`, {
      code,
      statusCode,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      requestId,
    });
    return sendError(res, code, err.message, statusCode, (err as any).details);
  }

  // Never leak internal stack traces, DB credentials, or paths to client
  logger.error('Unhandled internal server exception', err, {
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    requestId,
  });

  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred on the server. Please contact system administrator with your Request ID.',
    500
  );
}
