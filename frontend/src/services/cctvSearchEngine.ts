export type SearchState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'SEARCHING'
  | 'TARGET_ACQUIRED'
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'ERROR';

export interface TargetObject3D {
  name: string;
  position: [number, number, number];
  exists: boolean;
}

export interface CCTVScanMetrics {
  state: SearchState;
  scanAngleDeg: number;
  targetAngleDeg: number;
  angleDifferenceDeg: number;
  isTargetInCone: boolean;
  targetObject: TargetObject3D;
  cctvPosition: [number, number, number];
}

// Canonical target in the room space (e.g., Keys on desk)
export const DEFAULT_TARGET_OBJECT: TargetObject3D = {
  name: 'Keys',
  position: [-1.45, -0.38, 1.65],
  exists: true,
};

export const CCTV_WORLD_POSITION: [number, number, number] = [0.35, 0.15, 0.0];

/**
 * Calculates the exact spherical yaw (azimuth) and pitch (elevation)
 * from the CCTV lens to the target in world coordinates.
 */
export function calculateTargetAngles(
  cctvPos: [number, number, number],
  targetPos: [number, number, number]
): { yawDeg: number; yawRad: number; pitchRad: number } {
  const dx = targetPos[0] - cctvPos[0];
  const dy = targetPos[1] - cctvPos[1];
  const dz = targetPos[2] - cctvPos[2];

  const yawRad = Math.atan2(dx, dz);
  let yawDeg = (yawRad * 180) / Math.PI;
  if (yawDeg < 0) yawDeg += 360;

  const distHorizontal = Math.sqrt(dx * dx + dz * dz);
  const pitchRad = -Math.atan2(dy, distHorizontal);

  return { yawDeg, yawRad, pitchRad };
}

/**
 * Computes shortest angular distance between two degree angles [0, 360).
 */
export function shortestAngleDiffDeg(a: number, b: number): number {
  const diff = Math.abs((a - b + 180) % 360 - 180);
  return diff;
}
