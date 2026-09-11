import { db } from '../config/database';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';
import { logger } from '../utils/logger';

async function runDatabasePurge() {
  try {
    logger.info('Starting CONTROL F Database Operational Purge...');
    await db.init();

    // 1. Purge all tables (users, cameras, videos, searches, detections, tracks, audit logs)
    const result = await db.clearAllData();
    logger.info(`Cleared ${result.count} records from ${result.cleared.length} database tables.`);

    logger.info('Database has been completely cleared. No default data exists. Ready for fresh user registration.');
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during database purge', error);
    process.exit(1);
  }
}

runDatabasePurge();
