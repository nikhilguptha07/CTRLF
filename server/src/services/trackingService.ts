import { v4 as uuidv4 } from 'uuid';
import { BoundingBox, DetectionCandidate } from '../types/detection';
import { ActiveTrack, ITrackingService, TrackingResult, TrackingStatus, WorldVector3 } from '../types/tracking';
import { detectionConfig } from '../config/detectionConfig';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Calculates Intersection-over-Union (IoU) between two bounding boxes
 */
function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;
  const unionArea = boxAArea + boxBArea - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Calculates 3D CCTV Pan Angle (in degrees) toward target world position
 */
function calculateCctvPanAngle(targetPos: WorldVector3, cctvPos: [number, number, number]): number {
  const dx = targetPos.x - cctvPos[0];
  const dz = targetPos.z - cctvPos[2];
  // Three.js standard: atan2(dx, dz) in radians converted to degrees
  const angleRad = Math.atan2(dx, dz);
  return (angleRad * 180) / Math.PI;
}

export class TrackingService implements ITrackingService {
  private activeTracks: Map<string, ActiveTrack> = new Map();

  /**
   * Update tracks given detections from current video frame
   */
  update(
    detections: DetectionCandidate[],
    timestampMs: number,
    targetName?: string
  ): TrackingResult[] {
    const normalizedTarget = targetName ? targetName.toLowerCase().trim() : '';
    const assignedTrackIds = new Set<string>();
    const results: TrackingResult[] = [];

    // Filter detections exceeding the centralized confidence threshold
    const qualifiedDetections = detections.filter(
      (d) => d.confidence >= (detectionConfig.confidenceThreshold * 100)
    );

    for (const det of qualifiedDetections) {
      let bestIoU = 0;
      let matchedTrackId: string | null = null;

      // Find best overlapping active track for the same label
      for (const [trackId, track] of this.activeTracks.entries()) {
        if (track.objectName.toLowerCase() === det.label.toLowerCase()) {
          const iou = calculateIoU(det.boundingBox, track.currentBox);
          if (iou > bestIoU && iou >= detectionConfig.iouAssociationThreshold) {
            bestIoU = iou;
            matchedTrackId = trackId;
          }
        }
      }

      if (matchedTrackId && !assignedTrackIds.has(matchedTrackId)) {
        // Associate detection with existing track
        assignedTrackIds.add(matchedTrackId);
        const track = this.activeTracks.get(matchedTrackId)!;

        // Exponential smoothing (alpha = 0.65) for smooth bounding box trajectory
        const alpha = 0.65;
        track.currentBox = {
          x: alpha * det.boundingBox.x + (1 - alpha) * track.currentBox.x,
          y: alpha * det.boundingBox.y + (1 - alpha) * track.currentBox.y,
          width: alpha * det.boundingBox.width + (1 - alpha) * track.currentBox.width,
          height: alpha * det.boundingBox.height + (1 - alpha) * track.currentBox.height,
        };
        track.confidence = 0.7 * det.confidence + 0.3 * track.confidence;
        track.hitCount += 1;
        track.missCount = 0;
        track.lastUpdatedMs = timestampMs;
        track.history.push({
          box: { ...track.currentBox },
          timestampMs,
          confidence: track.confidence,
        });

        // Determine tracking status: LOCKED once verified across minimum frames
        const isTargetMatch = !normalizedTarget || det.label.toLowerCase().includes(normalizedTarget);
        if (track.hitCount >= detectionConfig.minTrackingFramesToLock && isTargetMatch) {
          track.status = 'LOCKED';
        } else {
          track.status = 'TRACKING';
        }

        // Real 2D->3D calibration is handled by CameraCalibrationService (Phase 7).
        // Fake world positions are strictly removed in production unless DEMO_MODE is true.
        let targetWorldPos: WorldVector3 | undefined = undefined;
        let aimAngle: number | undefined = undefined;

        if (env.DEMO_MODE || env.NODE_ENV === 'test') {
          targetWorldPos = {
            x: detectionConfig.defaultTargetWorldPosition[0],
            y: detectionConfig.defaultTargetWorldPosition[1],
            z: detectionConfig.defaultTargetWorldPosition[2],
          };
          aimAngle = calculateCctvPanAngle(targetWorldPos, detectionConfig.defaultCctvPosition);
        }

        track.worldPosition = targetWorldPos;

        results.push({
          trackId: track.trackId,
          objectName: track.objectName,
          confidence: parseFloat(track.confidence.toFixed(1)),
          x: Math.round(track.currentBox.x),
          y: Math.round(track.currentBox.y),
          width: Math.round(track.currentBox.width),
          height: Math.round(track.currentBox.height),
          timestamp: timestampMs,
          status: track.status,
          worldPosition: track.worldPosition,
          cctvAimAngleDeg: aimAngle !== undefined ? parseFloat(aimAngle.toFixed(2)) : undefined,
        });
      } else {
        // Initialize new Track
        const newTrackId = uuidv4();
        const isTargetMatch = !normalizedTarget || det.label.toLowerCase().includes(normalizedTarget);
        const initialStatus: TrackingStatus = 'TRACKING';

        let targetWorldPos: WorldVector3 | undefined = undefined;
        if (env.DEMO_MODE || env.NODE_ENV === 'test') {
          targetWorldPos = {
            x: detectionConfig.defaultTargetWorldPosition[0],
            y: detectionConfig.defaultTargetWorldPosition[1],
            z: detectionConfig.defaultTargetWorldPosition[2],
          };
        }

        const newTrack: ActiveTrack = {
          trackId: newTrackId,
          objectName: det.label,
          confidence: det.confidence,
          currentBox: { ...det.boundingBox },
          history: [{ box: { ...det.boundingBox }, timestampMs, confidence: det.confidence }],
          hitCount: 1,
          missCount: 0,
          lastUpdatedMs: timestampMs,
          status: initialStatus,
          worldPosition: targetWorldPos,
        };

        this.activeTracks.set(newTrackId, newTrack);
        assignedTrackIds.add(newTrackId);

        const aimAngle = targetWorldPos ? calculateCctvPanAngle(targetWorldPos, detectionConfig.defaultCctvPosition) : undefined;

        results.push({
          trackId: newTrackId,
          objectName: det.label,
          confidence: parseFloat(det.confidence.toFixed(1)),
          x: Math.round(det.boundingBox.x),
          y: Math.round(det.boundingBox.y),
          width: Math.round(det.boundingBox.width),
          height: Math.round(det.boundingBox.height),
          timestamp: timestampMs,
          status: initialStatus,
          worldPosition: targetWorldPos,
          cctvAimAngleDeg: aimAngle !== undefined ? parseFloat(aimAngle.toFixed(2)) : undefined,
        });
      }
    }

    // Age out and prune active tracks that were not updated
    for (const [trackId, track] of this.activeTracks.entries()) {
      if (!assignedTrackIds.has(trackId)) {
        track.missCount += 1;
        if (timestampMs - track.lastUpdatedMs > detectionConfig.trackingTimeoutMs) {
          track.status = 'LOST';
          results.push({
            trackId: track.trackId,
            objectName: track.objectName,
            confidence: 0,
            x: Math.round(track.currentBox.x),
            y: Math.round(track.currentBox.y),
            width: Math.round(track.currentBox.width),
            height: Math.round(track.currentBox.height),
            timestamp: timestampMs,
            status: 'LOST',
          });
          this.activeTracks.delete(trackId);
        }
      }
    }

    return results;
  }

  getActiveTracks(): TrackingResult[] {
    const list: TrackingResult[] = [];
    for (const track of this.activeTracks.values()) {
      list.push({
        trackId: track.trackId,
        objectName: track.objectName,
        confidence: parseFloat(track.confidence.toFixed(1)),
        x: Math.round(track.currentBox.x),
        y: Math.round(track.currentBox.y),
        width: Math.round(track.currentBox.width),
        height: Math.round(track.currentBox.height),
        timestamp: track.lastUpdatedMs,
        status: track.status,
        worldPosition: track.worldPosition,
      });
    }
    return list;
  }

  getLockedTarget(targetName: string): TrackingResult | null {
    const normalized = targetName.toLowerCase().trim();
    for (const track of this.activeTracks.values()) {
      if (track.status === 'LOCKED' && track.objectName.toLowerCase().includes(normalized)) {
        return {
          trackId: track.trackId,
          objectName: track.objectName,
          confidence: parseFloat(track.confidence.toFixed(1)),
          x: Math.round(track.currentBox.x),
          y: Math.round(track.currentBox.y),
          width: Math.round(track.currentBox.width),
          height: Math.round(track.currentBox.height),
          timestamp: track.lastUpdatedMs,
          status: 'LOCKED',
          worldPosition: track.worldPosition,
        };
      }
    }
    return null;
  }

  reset(): void {
    this.activeTracks.clear();
  }
}

export const trackingService = new TrackingService();
