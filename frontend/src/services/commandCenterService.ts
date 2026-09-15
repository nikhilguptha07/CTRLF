import { apiClient } from './apiClient';
import type { 
  CommandCenterPayload, 
} from '../types/commandCenter';

/**
 * Cleanly structured demo data for Security Command Center.
 * Decoupled so that backend endpoints can progressively replace individual datasets.
 */
export const DEFAULT_COMMAND_CENTER_DATA: CommandCenterPayload = {
  systemStatus: {
    camerasOnline: 3,
    camerasOffline: 1,
    aiEngineStatus: 'OPTIMAL',
    aiModelName: 'YOLOv8x + ByteTrack v2.1',
    storageUsagePercent: 84,
    storageText: '84% • 1.26 TB / 1.50 TB NVMe',
    lastDetection: {
      object: 'Hydro Flask Bottle',
      camera: 'CAM-01 (Overhead Sector A)',
      timestamp: '2 mins ago',
      confidence: 96.4,
    },
    processingStatus: 'INFERENCE_ACTIVE',
    fps: 60,
    latencyMs: 12,
  },
  investigations: [
    {
      caseId: 'CASE-2026-089',
      object: 'Black Tactical Backpack',
      status: 'SEARCHING',
      camera: 'CAM-02 (Perimeter Corridor)',
      confidence: 92.5,
      lastDetectedTime: '4 mins ago',
      operator: 'Agent Miller',
      notes: 'Continuous multi-angle tracking active.',
    },
    {
      caseId: 'CASE-2026-092',
      object: 'Stainless Steel Water Bottle',
      status: 'ANALYZING',
      camera: 'CAM-01 (Overhead Sector A)',
      confidence: 96.4,
      lastDetectedTime: '12 mins ago',
      operator: 'Operator Chen',
      notes: 'Spatial coordinate locked at desk index #4.',
    },
    {
      caseId: 'CASE-2026-094',
      object: 'Apple MacBook Pro 16"',
      status: 'IN_PROGRESS',
      camera: 'CAM-03 (Conference Hall North)',
      confidence: 88.1,
      lastDetectedTime: '28 mins ago',
      operator: 'Chief Reyes',
      notes: 'Temporal reconstruction verifying departure path.',
    },
  ],
  recentDetections: [
    {
      id: 'det-101',
      object: 'Hydro Flask Bottle',
      thumbnailUrl: '/evidence/frame_10_annotated.jpg',
      camera: 'CAM-01',
      location: 'Desk Alpha // Zone 02',
      timestamp: '16:48:12 UTC',
      confidence: 96.4,
      status: 'CONFIRMED',
      trackId: 104,
      color: 'Matte Black',
    },
    {
      id: 'det-102',
      object: 'Tactical Backpack',
      thumbnailUrl: '/evidence/frame_last_spot_annotated.jpg',
      camera: 'CAM-02',
      location: 'Corridor 3 // West Exit',
      timestamp: '16:44:05 UTC',
      confidence: 92.5,
      status: 'CONFIRMED',
      trackId: 108,
      color: 'Charcoal',
    },
    {
      id: 'det-103',
      object: 'Cell Phone (iPhone 15)',
      thumbnailUrl: '/evidence/frame_10_orig.jpg',
      camera: 'CAM-01',
      location: 'Conference Table B',
      timestamp: '16:32:40 UTC',
      confidence: 84.7,
      status: 'UNRESOLVED',
      trackId: 112,
      color: 'Midnight Blue',
    },
    {
      id: 'det-104',
      object: 'Luggage / Suitcase',
      thumbnailUrl: '/evidence/frame_last_spot_orig.jpg',
      camera: 'CAM-03',
      location: 'Lobby Transit Sector',
      timestamp: '16:15:19 UTC',
      confidence: 79.2,
      status: 'FLAGGED',
      trackId: 115,
      color: 'Metallic Silver',
    },
  ],
  alerts: [
    {
      id: 'alert-cam-04',
      type: 'CAMERA_OFFLINE',
      title: 'CAM-04 (Loading Dock West) Stream Interrupted',
      description: 'RTSP heartbeat lost for 142s. Camera failover ping timed out.',
      timestamp: '3m ago',
      severity: 'critical',
      source: 'CAM-04',
      actionLabel: 'Re-Probe Stream',
      actionPayload: 'cam-04',
    },
    {
      id: 'alert-review-01',
      type: 'REVIEW_REQUIRED',
      title: 'Detection Requires Operator Verification',
      description: 'Luggage / Suitcase detected in restricted lobby transit sector with 79% confidence.',
      timestamp: '15m ago',
      severity: 'warning',
      source: 'DET-104',
      actionLabel: 'Inspect Evidence',
      actionPayload: 'det-104',
    },
    {
      id: 'alert-storage-01',
      type: 'SYSTEM_WARNING',
      title: 'High Forensic Storage Buffer Utilization',
      description: 'Local NVMe circular buffer exceeds 80%. Older raw frames marked for archive pruning.',
      timestamp: '45m ago',
      severity: 'info',
      source: 'Storage Controller',
      actionLabel: 'Manage Storage',
      actionPayload: 'storage',
    },
  ],
  lastUpdated: new Date().toISOString(),
};

/**
 * Fetches command center operational telemetry.
 * Queries live backend when available, merging with realistic structure.
 */
export async function fetchCommandCenterData(): Promise<CommandCenterPayload> {
  const payload: CommandCenterPayload = {
    ...DEFAULT_COMMAND_CENTER_DATA,
    systemStatus: { ...DEFAULT_COMMAND_CENTER_DATA.systemStatus },
    investigations: [...DEFAULT_COMMAND_CENTER_DATA.investigations],
    recentDetections: [...DEFAULT_COMMAND_CENTER_DATA.recentDetections],
    alerts: [...DEFAULT_COMMAND_CENTER_DATA.alerts],
    lastUpdated: new Date().toISOString(),
  };

  try {
    // 1. Query live system health check
    const readyRes = await fetch(`${apiClient.getBaseUrl()}/ready`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (readyRes && readyRes.ok) {
      const readyJson = await readyRes.json().catch(() => null);
      if (readyJson?.status === 'ok') {
        payload.systemStatus.aiEngineStatus = 'OPTIMAL';
      }
    }

    // 2. Query registered cameras
    const cameras = await apiClient.getCameras().catch(() => null);
    if (Array.isArray(cameras) && cameras.length > 0) {
      const online = cameras.filter((c: any) => c.status === 'LIVE' || c.status === 'ACTIVE').length;
      const offline = cameras.length - online;
      payload.systemStatus.camerasOnline = online;
      payload.systemStatus.camerasOffline = offline;
    }

    // 3. Query recent search history
    const history = await apiClient.getSearchHistory().catch(() => null);
    if (Array.isArray(history) && history.length > 0) {
      const first = history[0];
      if (first) {
        payload.systemStatus.lastDetection = {
          object: first.target || first.objectName || 'Target Object',
          camera: 'CAM-01 (Overhead)',
          timestamp: 'Just now',
          confidence: first.confidence ? Math.round(first.confidence) : 95,
        };
      }
    }
  } catch (err) {
    console.warn('[CommandCenterService] Live sync notice (operating with telemetry baseline):', err);
  }

  return payload;
}
