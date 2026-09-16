import { env } from '../config/env';

/**
 * Validates whether an incoming HTTP or WebSocket origin is permitted.
 * In development and test environments, loopback/localhost origins are allowed.
 * In production, only origins configured in CLIENT_URL or CORS_ALLOWED_ORIGINS are accepted.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true; // Server-to-server, curl, container health probes

  const allowedList = [
    env.CLIENT_URL,
    ...env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  ];

  if (allowedList.includes(origin)) {
    return true;
  }

  // Allow localhost / loopback interfaces strictly in development and testing
  if (env.NODE_ENV !== 'production') {
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin === 'http://localhost' ||
      origin === 'http://127.0.0.1'
    ) {
      return true;
    }
  }

  return false;
}
