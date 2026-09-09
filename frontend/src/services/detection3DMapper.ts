/**
 * CONTROL F — 2D AI Detection to 3D Three.js CCTV Mapping Layer
 * Phase 7: Real Camera Calibration & CCTV Aiming
 *
 * CRITICAL CONCEPT:
 * A 2D YOLO detection produces an image-space bounding box (x1, y1, x2, y2).
 * From this we calculate the optical center (cx, cy) and normalized image coordinates (u, v).
 * Using camera intrinsics (fx, fy, cx, cy), we derive a true 3D viewing ray in camera/world space.
 *
 * TECHNICAL HONESTY:
 * Without depth (monocular CCTV), a 3D RAY is known, but a unique 3D world position is UNKNOWN.
 * - MODE A: RAY_ONLY (default) -> produces viewing ray and pan/tilt angles; worldPosition is null.
 * - MODE B: PLANE_INTERSECTION -> intersects ray with a defined scene plane (e.g. desk/floor).
 * - MODE C: DEPTH -> reserved for future physical depth cameras / stereo setups.
 *
 * Calibration status is marked ESTIMATED (or UNCALIBRATED), never CALIBRATED unless physically calibrated.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface ViewingRay {
  origin: Vector3D;
  direction: Vector3D;
}

export interface CameraIntrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  imageWidth: number;
  imageHeight: number;
}

export type LocalizationMode = 'RAY_ONLY' | 'PLANE_INTERSECTION' | 'DEPTH';
export type CalibrationStatus = 'UNCALIBRATED' | 'ESTIMATED' | 'CALIBRATED';

export interface BoundingBox2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ScenePlane {
  name: string;
  normal: Vector3D;
  pointOnPlane?: Vector3D;
  constant?: number; // Three.js plane equation: normal · X + constant = 0
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
}

export interface PlaneIntersectionResult {
  status: 'INTERSECTED' | 'NO_INTERSECTION' | 'OUT_OF_BOUNDS';
  point: Vector3D | null;
  distance: number | null;
  planeName: string;
}

export interface VisualizationTarget {
  sessionId: string;
  cameraId: string;
  trackId: number | null;
  className: string;
  confidence: number;

  imagePoint: {
    x: number;
    y: number;
  };

  normalizedPoint: {
    u: number;
    v: number;
  };

  ray: ViewingRay;

  desiredAngles: {
    yaw: number;
    pitch: number;
    yawRad: number;
    pitchRad: number;
    yawDeg: number;
    pitchDeg: number;
  };

  localizationMode: LocalizationMode;
  calibrationStatus: CalibrationStatus;

  // Explicitly null when localizationMode is RAY_ONLY (Technically honest - no fake 3D)
  worldPosition: Vector3D | null;
  planeIntersection?: PlaneIntersectionResult | null;
}

// Single authoritative CCTV fixed position in Three.js room space
export const CCTV_MOUNT_POSITION: Vector3D = { x: 0.36, y: 0.12, z: 0.1 };

// Development default calibrated desk plane in room space
export const DEFAULT_DESK_PLANE: ScenePlane = {
  name: 'DeskSurface',
  normal: { x: 0, y: 1, z: 0 },
  pointOnPlane: { x: -1.4, y: -0.45, z: 0.8 },
  constant: 0.45,
  minX: -2.3,
  maxX: -0.5,
  minZ: 0.2,
  maxZ: 1.4,
};

// Default Development Intrinsics (Pinhole model for 1920x1080 surveillance feed)
// Clearly marked ESTIMATED, not CALIBRATED
export const DEFAULT_DEV_INTRINSICS: Record<string, CameraIntrinsics & { status: CalibrationStatus }> = {
  CAM_01: {
    imageWidth: 1920,
    imageHeight: 1080,
    fx: 1440.0,
    fy: 1440.0,
    cx: 960.0,
    cy: 540.0,
    status: 'ESTIMATED',
  },
  CAM_02: {
    imageWidth: 1920,
    imageHeight: 1080,
    fx: 1440.0,
    fy: 1440.0,
    cx: 960.0,
    cy: 540.0,
    status: 'ESTIMATED',
  },
  CAM_03: {
    imageWidth: 1920,
    imageHeight: 1080,
    fx: 1440.0,
    fy: 1440.0,
    cx: 960.0,
    cy: 540.0,
    status: 'ESTIMATED',
  },
  CAM_04: {
    imageWidth: 1920,
    imageHeight: 1080,
    fx: 1440.0,
    fy: 1440.0,
    cx: 960.0,
    cy: 540.0,
    status: 'ESTIMATED',
  },
};

export class Detection3DMapper {
  /**
   * Validate and clamp 2D Bounding Box from YOLO detection.
   * Returns clamped coordinates or null if degenerate / invalid.
   */
  static validateBoundingBox(
    rawBbox: any,
    imageWidth: number,
    imageHeight: number
  ): BoundingBox2D | null {
    if (!rawBbox) return null;

    let x1: number;
    let y1: number;
    let x2: number;
    let y2: number;

    if (rawBbox.x1 !== undefined && rawBbox.x2 !== undefined) {
      x1 = Number(rawBbox.x1);
      y1 = Number(rawBbox.y1);
      x2 = Number(rawBbox.x2);
      y2 = Number(rawBbox.y2);
    } else if (rawBbox.x !== undefined && rawBbox.width !== undefined) {
      x1 = Number(rawBbox.x);
      y1 = Number(rawBbox.y);
      x2 = x1 + Number(rawBbox.width);
      y2 = y1 + Number(rawBbox.height);
    } else {
      return null;
    }

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      return null;
    }

    // Degenerate checks
    if (x2 <= x1 || y2 <= y1) {
      return null;
    }

    // Clamp to valid pixel image dimensions
    const clampedX1 = Math.max(0, Math.min(imageWidth, x1));
    const clampedY1 = Math.max(0, Math.min(imageHeight, y1));
    const clampedX2 = Math.max(0, Math.min(imageWidth, x2));
    const clampedY2 = Math.max(0, Math.min(imageHeight, y2));

    if (clampedX2 <= clampedX1 || clampedY2 <= clampedY1) {
      return null;
    }

    return {
      x1: clampedX1,
      y1: clampedY1,
      x2: clampedX2,
      y2: clampedY2,
    };
  }

  /**
   * Calculate Camera Viewing Ray from pixel coordinates using Pinhole Camera Model.
   *
   * Coordinate Convention:
   * Image space: Top-left origin, +X right, +Y down
   * Three.js 3D space: Right-handed, +X right, +Y UP, +Z towards viewer / -Z forward
   * Camera optical axis points along +Z forward in CCTV rig local space.
   *
   * Formula:
   * x_cam = (pixelX - cx) / fx
   * y_cam = -(pixelY - cy) / fy   <-- Note inverted Y: image Y down becomes 3D Y up
   * z_cam = 1.0                    <-- Optical forward axis
   */
  static calculateCameraRay(
    pixelX: number,
    pixelY: number,
    intrinsics: { fx: number; fy: number; cx: number; cy: number },
    origin: Vector3D = CCTV_MOUNT_POSITION
  ): ViewingRay {
    const { fx, fy, cx, cy } = intrinsics;

    const xCam = (pixelX - cx) / fx;
    const yCam = -(pixelY - cy) / fy;
    const zCam = 1.0;

    const length = Math.sqrt(xCam * xCam + yCam * yCam + zCam * zCam);

    return {
      origin: { ...origin },
      direction: {
        x: xCam / length,
        y: yCam / length,
        z: zCam / length,
      },
    };
  }

  /**
   * Calculate Mechanical Pan (Yaw) and Tilt (Pitch) Angles
   * from 3D unit direction vector:
   *  - Pan (Yaw) rotates around Y axis: atan2(dx, dz)
   *  - Tilt (Pitch) rotates around X axis: positive = pitch DOWN towards floor/desk
   */
  static calculateCctvAimingAngles(direction: Vector3D): {
    yaw: number;
    pitch: number;
    yawRad: number;
    pitchRad: number;
    yawDeg: number;
    pitchDeg: number;
  } {
    const { x: dx, y: dy, z: dz } = direction;

    // Azimuth / Yaw in horizontal XZ plane
    const yawRad = Math.atan2(dx, dz);
    const yawDeg = (yawRad * 180) / Math.PI;

    // Elevation / Pitch: positive tilt angle pitches DOWNWARDS in CCTV model
    const distHoriz = Math.sqrt(dx * dx + dz * dz);
    const pitchRad = -Math.atan2(dy, distHoriz);
    const pitchDeg = (pitchRad * 180) / Math.PI;

    // Enforce physical pan/tilt mechanical limits
    // Pan: ±175°
    const clampedYawDeg = Math.max(-175, Math.min(175, yawDeg));
    // Tilt: -35° (slight upward) to +85° (downward)
    const clampedPitchDeg = Math.max(-35, Math.min(85, pitchDeg));

    const finalYawRad = (clampedYawDeg * Math.PI) / 180;
    const finalPitchRad = (clampedPitchDeg * Math.PI) / 180;

    return {
      yaw: finalYawRad,
      pitch: finalPitchRad,
      yawRad: finalYawRad,
      pitchRad: finalPitchRad,
      yawDeg: clampedYawDeg,
      pitchDeg: clampedPitchDeg,
    };
  }

  /**
   * MODE B: Intersect Ray with Physical Scene Plane.
   */
  static intersectRayWithPlane(
    ray: ViewingRay,
    plane: ScenePlane
  ): PlaneIntersectionResult {
    const { origin, direction } = ray;
    const { normal } = plane;

    const denom = normal.x * direction.x + normal.y * direction.y + normal.z * direction.z;

    // Parallel ray check
    if (Math.abs(denom) < 1e-6) {
      return {
        status: 'NO_INTERSECTION',
        point: null,
        distance: null,
        planeName: plane.name,
      };
    }

    let t: number;
    if (plane.constant !== undefined) {
      t = -(normal.x * origin.x + normal.y * origin.y + normal.z * origin.z + plane.constant) / denom;
    } else if (plane.pointOnPlane) {
      const p0 = plane.pointOnPlane;
      const num = normal.x * (p0.x - origin.x) + normal.y * (p0.y - origin.y) + normal.z * (p0.z - origin.z);
      t = num / denom;
    } else {
      return {
        status: 'NO_INTERSECTION',
        point: null,
        distance: null,
        planeName: plane.name,
      };
    }

    // Behind camera check
    if (t <= 0) {
      return {
        status: 'NO_INTERSECTION',
        point: null,
        distance: null,
        planeName: plane.name,
      };
    }

    const ix = origin.x + direction.x * t;
    const iy = origin.y + direction.y * t;
    const iz = origin.z + direction.z * t;

    // Perimeter boundary check
    if (
      (plane.minX !== undefined && ix < plane.minX) ||
      (plane.maxX !== undefined && ix > plane.maxX) ||
      (plane.minZ !== undefined && iz < plane.minZ) ||
      (plane.maxZ !== undefined && iz > plane.maxZ)
    ) {
      return {
        status: 'OUT_OF_BOUNDS',
        point: { x: ix, y: iy, z: iz },
        distance: t,
        planeName: plane.name,
      };
    }

    return {
      status: 'INTERSECTED',
      point: { x: ix, y: iy, z: iz },
      distance: t,
      planeName: plane.name,
    };
  }

  /**
   * Primary Mapping Entrypoint:
   * Maps a 2D AI detection into a 3D VisualizationTarget.
   */
  static mapDetectionTo3D(
    detection: {
      sessionId?: string;
      cameraId?: string;
      trackId?: number | null;
      className?: string;
      confidence?: number;
      bbox?: any;
      boundingBox?: any;
      imageWidth?: number;
      imageHeight?: number;
    },
    calibrationOverride?: CameraIntrinsics & { status?: CalibrationStatus },
    mode: LocalizationMode = 'RAY_ONLY',
    customPlane?: ScenePlane
  ): VisualizationTarget | null {
    const camId = detection.cameraId || 'CAM_01';
    const calib = calibrationOverride || DEFAULT_DEV_INTRINSICS[camId] || DEFAULT_DEV_INTRINSICS.CAM_01;

    const imgWidth = detection.imageWidth || calib.imageWidth || 1920;
    const imgHeight = detection.imageHeight || calib.imageHeight || 1080;

    const rawBbox = detection.bbox || detection.boundingBox;
    const bbox = this.validateBoundingBox(rawBbox, imgWidth, imgHeight);
    if (!bbox) {
      return null;
    }

    const centerX = (bbox.x1 + bbox.x2) / 2.0;
    const centerY = (bbox.y1 + bbox.y2) / 2.0;

    const u = centerX / imgWidth;
    const v = centerY / imgHeight;

    const ray = this.calculateCameraRay(centerX, centerY, calib, CCTV_MOUNT_POSITION);
    const desiredAngles = this.calculateCctvAimingAngles(ray.direction);

    let worldPosition: Vector3D | null = null;
    let planeIntersection: PlaneIntersectionResult | null = null;

    if (mode === 'PLANE_INTERSECTION') {
      planeIntersection = this.intersectRayWithPlane(ray, customPlane || DEFAULT_DESK_PLANE);
      if (planeIntersection.status === 'INTERSECTED' && planeIntersection.point) {
        worldPosition = planeIntersection.point;
      }
    } else {
      // RAY_ONLY: Technically honest - worldPosition is null
      worldPosition = null;
    }

    return {
      sessionId: detection.sessionId || '',
      cameraId: camId,
      trackId: detection.trackId != null ? Number(detection.trackId) : null,
      className: detection.className || 'target',
      confidence: detection.confidence ?? 0,
      imagePoint: { x: centerX, y: centerY },
      normalizedPoint: { u, v },
      ray,
      desiredAngles,
      localizationMode: mode,
      calibrationStatus: calib.status || 'ESTIMATED',
      worldPosition,
      planeIntersection,
    };
  }
}
