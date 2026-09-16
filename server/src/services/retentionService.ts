import { videoRepository } from '../repositories/videoRepository';
import { storageService } from './storageService';
import { auditService } from './auditService';
import { logger } from '../utils/logger';

export type RetentionPreset = '7d' | '30d' | '90d' | 'custom';

export interface RetentionPolicy {
  preset: RetentionPreset;
  retentionDays: number;
  autoDeleteEnabled: boolean;
  lastCleanupAt: string | null;
  lastDeletedCount: number;
  lastFreedBytes: number;
}

export interface RetentionStatus extends RetentionPolicy {
  totalVideosCount: number;
  totalStorageBytes: number;
  eligiblePurgeCount: number;
  eligiblePurgeBytes: number;
  cutoffDate: string;
}

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  freedBytes: number;
  cutoffDate: string;
  errors?: string[];
  dryRun?: boolean;
}

export class RetentionService {
  private policy: RetentionPolicy = {
    preset: '30d',
    retentionDays: 30,
    autoDeleteEnabled: false,
    lastCleanupAt: null,
    lastDeletedCount: 0,
    lastFreedBytes: 0,
  };

  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // Check auto-retention hourly
    this.timer = setInterval(() => {
      if (this.policy.autoDeleteEnabled) {
        this.executeRetentionCleanup({ triggeredBy: 'SCHEDULED_AUTO_DAEMON' }).catch((err) => {
          logger.error('Error during scheduled retention cleanup', err);
        });
      }
    }, 60 * 60 * 1000);
  }

  public getPolicy(): RetentionPolicy {
    return { ...this.policy };
  }

  public async updatePolicy(
    updates: { preset?: RetentionPreset; retentionDays?: number; autoDeleteEnabled?: boolean },
    userId?: string
  ): Promise<RetentionPolicy> {
    if (updates.preset) {
      this.policy.preset = updates.preset;
      if (updates.preset === '7d') this.policy.retentionDays = 7;
      else if (updates.preset === '30d') this.policy.retentionDays = 30;
      else if (updates.preset === '90d') this.policy.retentionDays = 90;
    }

    if (updates.retentionDays !== undefined && updates.preset === 'custom') {
      this.policy.retentionDays = Math.max(1, Number(updates.retentionDays));
    }

    if (updates.autoDeleteEnabled !== undefined) {
      this.policy.autoDeleteEnabled = Boolean(updates.autoDeleteEnabled);
    }

    await auditService.record({
      userId: userId || 'SYSTEM',
      action: 'RETENTION_POLICY_UPDATED',
      resourceType: 'RETENTION_POLICY',
      status: 'SUCCESS',
      details: {
        preset: this.policy.preset,
        retentionDays: this.policy.retentionDays,
        autoDeleteEnabled: this.policy.autoDeleteEnabled,
      },
    });

    return { ...this.policy };
  }

  public async getStatus(): Promise<RetentionStatus> {
    const allVideos = await videoRepository.findAll();
    const cutoff = new Date(Date.now() - this.policy.retentionDays * 24 * 60 * 60 * 1000);

    let totalStorageBytes = 0;
    let eligiblePurgeCount = 0;
    let eligiblePurgeBytes = 0;

    for (const v of allVideos) {
      const size = v.fileSizeBytes || 0;
      totalStorageBytes += size;
      if (new Date(v.createdAt).getTime() < cutoff.getTime()) {
        eligiblePurgeCount++;
        eligiblePurgeBytes += size;
      }
    }

    return {
      ...this.policy,
      totalVideosCount: allVideos.length,
      totalStorageBytes,
      eligiblePurgeCount,
      eligiblePurgeBytes,
      cutoffDate: cutoff.toISOString(),
    };
  }

  /**
   * Actually purges expired videos from physical storage and the database
   */
  public async executeRetentionCleanup(options?: {
    dryRun?: boolean;
    triggeredBy?: string;
    userId?: string;
  }): Promise<CleanupResult> {
    const isDryRun = Boolean(options?.dryRun);
    const triggeredBy = options?.triggeredBy || 'MANUAL_OPERATOR';
    const userId = options?.userId || 'SYSTEM';

    const allVideos = await videoRepository.findAll();
    const cutoff = new Date(Date.now() - this.policy.retentionDays * 24 * 60 * 60 * 1000);

    const expired = allVideos.filter((v) => new Date(v.createdAt).getTime() < cutoff.getTime());

    if (isDryRun) {
      const freedBytes = expired.reduce((acc, v) => acc + (v.fileSizeBytes || 0), 0);
      return {
        success: true,
        dryRun: true,
        deletedCount: expired.length,
        freedBytes,
        cutoffDate: cutoff.toISOString(),
      };
    }

    let deletedCount = 0;
    let freedBytes = 0;
    const errors: string[] = [];

    for (const video of expired) {
      try {
        if (video.storagePath) {
          await storageService.delete(video.storagePath).catch(() => {});
        }
        await videoRepository.delete(video.id, video.userId);
        deletedCount++;
        freedBytes += video.fileSizeBytes || 0;
      } catch (err: any) {
        errors.push(`Failed to delete video ${video.id}: ${err?.message || err}`);
      }
    }

    this.policy.lastCleanupAt = new Date().toISOString();
    this.policy.lastDeletedCount = deletedCount;
    this.policy.lastFreedBytes = freedBytes;

    await auditService.record({
      userId,
      action: 'RETENTION_AUTO_DELETION_EXECUTED',
      resourceType: 'RETENTION_POLICY',
      status: 'SUCCESS',
      details: {
        triggeredBy,
        deletedCount,
        freedBytes,
        cutoffDate: cutoff.toISOString(),
        policyDays: this.policy.retentionDays,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

    logger.info(`Retention cleanup completed: ${deletedCount} videos purged, ${freedBytes} bytes freed.`, {
      triggeredBy,
    });

    return {
      success: true,
      deletedCount,
      freedBytes,
      cutoffDate: cutoff.toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  public destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const retentionService = new RetentionService();
