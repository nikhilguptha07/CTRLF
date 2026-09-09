export interface LogContext {
  requestId?: string;
  userId?: string;
  searchId?: string;
  cameraId?: string;
  status?: string;
  [key: string]: unknown;
}

class Logger {
  private sanitize(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = [
      'password',
      'password_hash',
      'passwordhash',
      'refreshtoken',
      'token',
      'jwt',
      'authorization',
      'rtsp_url',
      'rtspurl',
      'secret',
      'encryption_key',
    ];

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private formatMessage(level: string, message: string, context?: LogContext) {
    const logObject = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? (this.sanitize(context) as Record<string, unknown>) : {}),
    };

    return JSON.stringify(logObject);
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, error?: unknown, context?: LogContext) {
    const errorDetails = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack }
      : { error };

    console.error(
      this.formatMessage('ERROR', message, {
        ...context,
        ...errorDetails,
      })
    );
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }
}

export const logger = new Logger();
