import fs from 'fs';
import path from 'path';
import { db } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  message?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    api: ServiceHealth;
    database: ServiceHealth;
    aiService: ServiceHealth;
    storage: ServiceHealth;
  };
}

export class HealthService {
  async getHealthReport(): Promise<SystemHealthReport> {
    // 1. API Service
    const apiHealth: ServiceHealth = {
      status: 'healthy',
      details: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
      },
    };

    // 2. Database Service
    let dbHealth: ServiceHealth = { status: 'unhealthy' };
    try {
      const dbResult = await db.execute('SELECT 1 FROM DUAL');
      const isOk = Array.isArray(dbResult.rows) && dbResult.rows.length > 0;
      dbHealth = {
        status: isOk ? 'healthy' : 'unhealthy',
        details: {
          engine: db.isMock() ? 'in_memory_relational' : 'oracle_21c_xe',
        },
      };
    } catch (err: any) {
      logger.warn('Database health check probe failed', { error: err.message });
      dbHealth = {
        status: 'unhealthy',
        message: 'Database connection failed',
      };
    }

    // 3. AI Vision Service
    let aiHealth: ServiceHealth = { status: 'offline' };
    try {
      const { aiVisionService } = await import('./aiVisionService');
      const isAiHealthy = await (aiVisionService as any).provider.checkHealth();
      aiHealth = {
        status: isAiHealthy ? 'healthy' : 'offline',
        details: {
          available: isAiHealthy,
        },
      };
    } catch {
      aiHealth = {
        status: 'offline',
        message: 'AI Vision service is unreachable',
      };
    }

    // 4. Storage Subsystem (uploads/evidence/reports partitions)
    let storageHealth: ServiceHealth = { status: 'healthy' };
    try {
      const baseDir = path.resolve(env.UPLOAD_DIR);
      const partitions = ['original', 'evidence', 'temp', 'reports'];
      for (const p of partitions) {
        const full = path.join(baseDir, p);
        if (!fs.existsSync(full)) {
          fs.mkdirSync(full, { recursive: true });
        }
        await fs.promises.access(full, fs.constants.W_OK);
      }
      storageHealth = {
        status: 'healthy',
        details: {
          provider: env.STORAGE_PROVIDER,
          writable: true,
        },
      };
    } catch (err: any) {
      logger.warn('Storage health probe failed', { error: err.message });
      storageHealth = {
        status: 'unhealthy',
        message: 'Storage partition check failed',
      };
    }

    // Overall aggregate status calculation
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbHealth.status === 'unhealthy' || storageHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (aiHealth.status !== 'healthy') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '2.5.0',
      services: {
        api: apiHealth,
        database: dbHealth,
        aiService: aiHealth,
        storage: storageHealth,
      },
    };
  }
}

export const healthService = new HealthService();
