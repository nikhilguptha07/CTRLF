import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  } | null;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown
): Response {
  const reqId = (res.req as any)?.id;
  const response: ApiResponse = {
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(reqId ? { requestId: reqId } : {}),
      ...(details ? { details } : {}),
    },
  };
  return res.status(statusCode).json(response);
}
