import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { db } from './config/database';
import { authService } from './services/authService';
import { socketManager } from './websocket/socketManager';
import { logger } from './utils/logger';

const server = http.createServer(app);

// Initialize WebSockets
socketManager.init(server);

async function bootstrap() {
  try {
    // 1. Initialize Oracle 21c XE Connection Pool (Section 8)
    await db.init();

    // 2. Pre-seed default authoritative users (Admin, Operator, Viewer) (Sections 3 & 4)
    try {
      await authService.seedDefaultUsers();
    } catch (err: any) {
      logger.warn('Initial user seeding encountered non-fatal error; continuing startup', { error: err?.message || err });
    }

    // 3. Perform crash recovery scan for interrupted search sessions & jobs (Section 40)
    try {
      await db.recoverStaleJobs();
    } catch (err: any) {
      logger.warn('Job recovery scan encountered non-fatal error; continuing startup', { error: err?.message || err });
    }

    // 4. Start HTTP & WebSocket Server
    server.listen(env.PORT, () => {
      logger.info(`CONTROL F Backend Server listening on port ${env.PORT}`, {
        env: env.NODE_ENV,
        port: env.PORT,
        apiPrefix: env.API_PREFIX,
        oracleMode: db.isMock() ? 'OFFLINE_IN_MEMORY' : 'ORACLE_21C_XE_THIN',
      });
    });
  } catch (error) {
    logger.error('Fatal bootstrap error', error);
    process.exit(1);
  }
}

// Graceful Shutdown Handling (Section 38 & 39)
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP & WebSocket server stopped accepting connections');
    try {
      // Release Oracle connection pool
      await db.close();
      logger.info('CONTROL F Backend cleanup completed cleanly');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database cleanup', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if lingering
  setTimeout(() => {
    logger.error('Forced shutdown timeout exceeded');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap();
