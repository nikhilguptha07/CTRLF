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

  // 1. Intercept raw database errors (Oracle ORA- / NJS- or SQL errors)
  const isOracleError =
    Boolean((err as any).errorNum) ||
    Boolean((err as any).code && typeof (err as any).code === 'string' && (err as any).code.startsWith('ORA-')) ||
    Boolean((err as any).code && typeof (err as any).code === 'string' && (err as any).code.startsWith('NJS-')) ||
    Boolean(err.message && /ORA-\d+|NJS-\d+/i.test(err.message));

  if (isOracleError) {
    logger.error('Technical database error intercepted', err, {
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      requestId,
      rawCode: (err as any).code,
      errorNum: (err as any).errorNum,
    });

    return sendError(
      res,
      'DATABASE_ERROR',
      'Unable to process the request. Please try again.',
      500
    );
  }

  // 2. Safe operational application errors (AppError)
  if (err instanceof AppError) {
    logger.warn(`Handled application error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      requestId,
    });
    return sendError(res, err.code, err.message, err.statusCode, err.details);
  }

  // 3. Generic Error with custom statusCode/code (non-database)
  if ((err as any).statusCode && (err as any).statusCode < 500 && (err as any).code) {
    const statusCode = (err as any).statusCode;
    const code = (err as any).code;
    logger.warn(`Handled client operational error: ${err.message}`, {
      code,
      statusCode,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      requestId,
    });
    return sendError(res, code, err.message, statusCode, (err as any).details);
  }

  // 4. Never leak internal stack traces, DB credentials, or paths to client
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
