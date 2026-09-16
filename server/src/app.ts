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
import { healthService } from './services/healthService';
import { isAllowedOrigin } from './utils/corsValidator';

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
        imgSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
        mediaSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
        connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  })
);

// 3. Origin Verification & Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// 4. Body Parsers & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. Rate Limiting Protection (Section 25)
app.use(apiRateLimiter);

// 6. Partitioned Static Storage Mounts (Sections 18 & 19)
app.use(
  '/uploads/evidence',
  optionalAuthenticate,
  authorize(Permission.EVIDENCE_VIEW),
  express.static(path.resolve(env.UPLOAD_DIR, 'evidence'))
);

app.use('/uploads/videos', express.static(path.resolve(env.UPLOAD_DIR, 'videos')));
app.use('/uploads/frames', express.static(path.resolve(env.UPLOAD_DIR, 'frames')));

// Serve compiled frontend static assets in fullstack / unified deployments (e.g. Render Web Service)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const hasFrontendDist = fs.existsSync(frontendDistPath);

if (hasFrontendDist) {
  app.use(express.static(frontendDistPath));
}

// 7. Mount Authoritative API Routes
app.use(env.API_PREFIX, routes);

// Root health check endpoint for container / load balancer probes
app.get('/health', async (_req, res) => {
  const report = await healthService.getHealthReport();
  const statusCode = report.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json({
    status: 'ONLINE',
    success: report.status !== 'unhealthy',
    system: 'CONTROL F Surveillance Intelligence Backend',
    version: '2.5.0',
    timestamp: new Date().toISOString(),
    services: report.services,
    data: report,
  });
});

app.get('/', (req, res) => {
  if (hasFrontendDist && req.accepts('html')) {
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  }
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

// Single Page Application routing fallback for React router
if (hasFrontendDist) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 8. Centralized Safe Error Handling Pipeline (Section 16)
app.use(errorHandler);
