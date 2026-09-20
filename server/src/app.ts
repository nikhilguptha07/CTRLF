import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import routes from './routes';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestIdMiddleware';
import { optionalAuthenticate, authorize } from './middleware/authMiddleware';
import { Permission } from './types/user';
import { logger } from './utils/logger';

export const app = express();

// 1. Correlation Request ID Middleware (Section 15)
app.use(requestIdMiddleware);

// 2. Security Headers via Helmet (Section 27)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
        mediaSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
        connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  })
);

// 3. Cross-Origin Resource Sharing with dynamic localhost support (Section 28)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocalhost =
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === 'http://localhost' ||
        origin === 'http://127.0.0.1' ||
        origin === env.CLIENT_URL;
      if (isLocalhost) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Internal-Service-Key'],
  })
);

// 4. Request Parsing with strict payload bounds
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. Global API Rate Limiter (Section 25)
app.use(env.API_PREFIX, apiRateLimiter);

// 6. Evidence Access Control (Section 24)
// Only authenticated users with EVIDENCE_VIEW permission may retrieve evidence files
app.use(
  '/uploads/evidence',
  optionalAuthenticate,
  authorize(Permission.EVIDENCE_VIEW),
  express.static(path.resolve(env.UPLOAD_DIR, 'evidence'))
);

// General static assets (non-evidence frames/thumbnails)
app.use('/uploads/videos', express.static(path.resolve(env.UPLOAD_DIR, 'videos')));
app.use('/uploads/frames', express.static(path.resolve(env.UPLOAD_DIR, 'frames')));

// 7. Mount Authoritative API Routes
app.use(env.API_PREFIX, routes);

// 8. Serve Frontend SPA if built (Unified Production Deployment)
const candidateDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
];
const frontendDist = candidateDistPaths.find((p) => fs.existsSync(p));

if (frontendDist) {
  logger.info(`Serving static frontend build from: ${frontendDist}`);

  // Serve static assets (js, css, images, etc.) except index.html on root if JSON is explicitly requested
  app.use(express.static(frontendDist, { index: false }));

  // Root endpoint: serve index.html for browsers, or JSON status for API clients / monitors
  app.get('/', (req, res) => {
    if (req.accepts('html')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    return res.status(200).json({
      status: 'ONLINE',
      system: 'CONTROL F Surveillance Intelligence Backend',
      version: '2.5.0',
      endpoints: {
        health: `${env.API_PREFIX}/health`,
        ready: `${env.API_PREFIX}/ready`,
        auth: `${env.API_PREFIX}/auth`,
        search: `${env.API_PREFIX}/search`,
        cameras: `${env.API_PREFIX}/cameras`,
        videos: `${env.API_PREFIX}/videos`,
      },
    });
  });

  // SPA fallback for all client routes (e.g. /admin, /login, /dashboard)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith(env.API_PREFIX) || req.path.startsWith('/uploads')) {
      return next();
    }
    if (req.accepts('html')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
} else {
  // Standalone API mode fallback
  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ONLINE',
      system: 'CONTROL F Surveillance Intelligence Backend',
      version: '2.5.0',
      endpoints: {
        health: `${env.API_PREFIX}/health`,
        ready: `${env.API_PREFIX}/ready`,
        auth: `${env.API_PREFIX}/auth`,
        search: `${env.API_PREFIX}/search`,
        cameras: `${env.API_PREFIX}/cameras`,
        videos: `${env.API_PREFIX}/videos`,
      },
    });
  });
}

// 8. Centralized Safe Error Handling Pipeline (Section 16)
app.use(errorHandler);
