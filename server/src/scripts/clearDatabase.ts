import { db } from '../config/database';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';
import { logger } from '../utils/logger';

async function runDatabasePurge() {
  try {
    logger.info('Starting CONTROL F Database Operational Purge...');
    await db.init();

    // 1. Purge operational tables (searches, detections, evidence, videos, audit logs)
    const result = await db.clearOperationalData();
    logger.info(`Cleared ${result.count} records from ${result.cleared.length} operational tables.`);

    // 2. Re-seed default users (Admin, Operator, User)
    await authService.seedDefaultUsers();
    logger.info('Default authoritative accounts verified and seeded.');

    // 3. Record clean genesis audit log
    await auditService.record({
      action: 'SYSTEM_DATABASE_INITIALIZED',
      resourceType: 'DATABASE',
      resourceId: 'ORACLE_21C_XE',
      status: 'SUCCESS',
      details: {
        message: 'Operational database cleared and fresh system state established.',
        seededAccounts: ['admin@ctrlf.local', 'operator@ctrlf.local', 'user@ctrlf.local'],
        timestamp: new Date().toISOString(),
      },
    });

    logger.info('Database operational purge and clean initialization completed successfully.');
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during database purge', error);
    process.exit(1);
  }
}

runDatabasePurge();
