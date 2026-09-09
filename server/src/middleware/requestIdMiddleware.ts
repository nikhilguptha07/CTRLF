import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Enterprise Correlation Request ID Middleware
 * Assigns or propagates X-Request-ID across the full request lifecycle,
 * facilitating distributed tracing across React, Node, AI Service, and Oracle Audit.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim().length > 0
    ? incomingId.trim()
    : uuidv4();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
