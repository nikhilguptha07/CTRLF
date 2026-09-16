import { v4 as uuidv4 } from 'uuid';
import { auditService } from './auditService';

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface OperationalAlert {
  id: string;
  type: 'CAMERA_OFFLINE' | 'REVIEW_REQUIRED' | 'MATCH_CONFIRMED' | 'PROCESSING_FAILED' | 'STORAGE_WARNING' | 'SYSTEM_ALERT';
  severity: AlertSeverity;
  timestamp: string;
  source: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
  resolved: boolean;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
}

export class AlertService {
  private alerts: OperationalAlert[] = [
    {
      id: 'alt-01',
      type: 'CAMERA_OFFLINE',
      severity: 'critical',
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      source: 'CAM-04 (Perimeter West)',
      description: 'RTSP video stream disconnected. 3 heartbeat timeouts detected on port 8554.',
      actionLabel: 'Inspect Camera',
      actionRoute: 'cameras',
      resolved: false,
    },
    {
      id: 'alt-02',
      type: 'REVIEW_REQUIRED',
      severity: 'warning',
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      source: 'Inference Engine // CAM-07',
      description: 'Candidate match detected (88.4% confidence) for search target. Human verification required before lock.',
      actionLabel: 'Review Candidate',
      actionRoute: 'search',
      resolved: false,
    },
    {
      id: 'alt-03',
      type: 'MATCH_CONFIRMED',
      severity: 'info',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      source: 'Investigation INV-2026-00421',
      description: 'Target correlation confirmed across CAM-07, CAM-12, and CAM-18. Spatial trajectory locked.',
      actionLabel: 'View Dossier',
      actionRoute: 'investigation',
      resolved: false,
    },
    {
      id: 'alt-04',
      type: 'PROCESSING_FAILED',
      severity: 'critical',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      source: 'Worker #2 // Frame Extractor',
      description: 'Frame extraction pipeline encountered a corrupt GOP sequence in stream chunk 4029. Re-queued.',
      actionLabel: 'View Logs',
      actionRoute: 'logs',
      resolved: false,
    },
    {
      id: 'alt-05',
      type: 'STORAGE_WARNING',
      severity: 'warning',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      source: 'Storage Engine // NVMe-Pool-1',
      description: 'Primary footage volume reached 84% utilization. Auto-retention purge scheduled if >90%.',
      actionLabel: 'Retention Policy',
      actionRoute: 'settings',
      resolved: false,
    },
  ];

  public getAlerts(): OperationalAlert[] {
    return [...this.alerts];
  }

  public async acknowledgeAlert(id: string, userId?: string): Promise<OperationalAlert | null> {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) return null;

    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userId || 'OPERATOR';

    await auditService.record({
      userId: userId || 'OPERATOR',
      action: 'ALERT_ACKNOWLEDGED',
      resourceType: 'ALERT',
      resourceId: id,
      status: 'SUCCESS',
      details: { alertType: alert.type, source: alert.source, severity: alert.severity },
    });

    return alert;
  }

  public async resolveAlert(id: string, userId?: string): Promise<OperationalAlert | null> {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) return null;

    alert.resolved = true;

    await auditService.record({
      userId: userId || 'OPERATOR',
      action: 'ALERT_RESOLVED',
      resourceType: 'ALERT',
      resourceId: id,
      status: 'SUCCESS',
      details: { alertType: alert.type, source: alert.source, severity: alert.severity },
    });

    return alert;
  }

  public createAlert(alertData: Omit<OperationalAlert, 'id' | 'timestamp' | 'resolved'>): OperationalAlert {
    const newAlert: OperationalAlert = {
      id: `alt-${uuidv4().substring(0, 8)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...alertData,
    };
    this.alerts.unshift(newAlert);
    return newAlert;
  }
}

export const alertService = new AlertService();
