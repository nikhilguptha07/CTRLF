/**
 * Centralized Detection & Tracking Configuration
 * Single Source of Truth for Vision Pipeline Parameters
 */
export const detectionConfig = {
  confidenceThreshold: 0.75,       // Minimum 75% confidence required for positive match
  iouAssociationThreshold: 0.30,   // Minimum IoU overlap to associate detection across frames
  minTrackingFramesToLock: 2,      // Consecutive frames required to confirm locked target
  trackingTimeoutMs: 1200,         // Frame timeout before track is marked LOST
  cctvAimingToleranceDeg: 12.0,    // Angular tolerance cone in degrees
  defaultCctvPosition: [0.35, 0.15, 0.0] as [number, number, number],
  defaultTargetWorldPosition: [-1.45, -0.38, 1.65] as [number, number, number],
};
