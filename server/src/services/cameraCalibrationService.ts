import { v4 as uuidv4 } from 'uuid';
import {
  CameraCalibrationRecord,
  CameraIntrinsics,
  CameraExtrinsics,
  CalibrationStatus,
  LocalizationMode,
  DistortionModel,
  ViewingRay,
  ScenePlane,
  PlaneIntersectionResult,
  BoundingBox2D,
  Detection2DInput,
  VisualizationTarget,
  Vector3D,
} from '../types/calibration';
import { calibrationRepository } from '../repositories/calibrationRepository';
import { auditService } from './auditService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// Default calibrated desk plane in room coordinates
export const DEFAULT_DESK_PLANE: ScenePlane = {
  name: 'Surveillance Sector Desk Plane',
  pointOnPlane: [0, -0.45, 0.8],
  normal: [0, 1, 0], // Horizontal surface facing upwards
  bounds: {
    minX: -2.5,
    maxX: 1.0,
    minZ: -1.0,
    maxZ: 2.2,
  },
};

// Authoritative CCTV Physical Mounting Position in Three.js Studio Scene
export const CCTV_DEFAULT_RIG_POSITION: [number, number, number] = [0.36, 0.12, 0.1];

export class CameraCalibrationService {
  // Cache of validated intrinsic matrices for high-throughput frame processing
  private intrinsicsCache = new Map<string, CameraIntrinsics>();

  /**
   * Return a default uncalibrated configuration
   */
  getDefaultCalibration(cameraId: string): CameraCalibrationRecord {
    const imageWidth = 1920;
    const imageHeight = 1080;

    // Standard pinhole approximation for typical 67° horizontal surveillance FOV
    // fx = width / (2 * tan(hfov / 2)) = 1920 / (2 * tan(33.5°)) ≈ 1450.0
    const fx = 1440.0;
    const fy = 1440.0;
    const cx = 960.0;
    const cy = 540.0;

    return {
      id: uuidv4(),
      cameraId,
      imageWidth,
      imageHeight,
      fx,
      fy,
      cx,
      cy,
      distortionModel: 'NONE',
      distortionCoefficients: [0, 0, 0, 0, 0],
      calibrationStatus: 'UNCALIBRATED',
      localizationMode: 'RAY_ONLY',
      calibratedAt: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Load or provision camera calibration configuration from database
   */
  async getCalibration(cameraId: string): Promise<CameraCalibrationRecord> {
    try {
      const existing = await calibrationRepository.findByCameraId(cameraId);
      if (existing) {
        return existing;
      }
    } catch (err) {
      logger.warn(`Could not query calibration table for camera ${cameraId}, using estimated config`, { error: err });
    }

    // Auto-provision standard UNCALIBRATED configuration
    const def = this.getDefaultCalibration(cameraId);
    try {
      return await calibrationRepository.upsert(def);
    } catch {
      return def;
    }
  }

  /**
   * Save or update camera calibration with full audit trail
   */
  async updateCalibration(
    cameraId: string,
    updates: Partial<CameraCalibrationRecord>,
    userId?: string
  ): Promise<CameraCalibrationRecord> {
    const current = await this.getCalibration(cameraId);

    // Validate parameters
    const imageWidth = updates.imageWidth ?? current.imageWidth;
    const imageHeight = updates.imageHeight ?? current.imageHeight;
    const fx = updates.fx ?? current.fx;
    const fy = updates.fy ?? current.fy;
    const cx = updates.cx ?? current.cx;
    const cy = updates.cy ?? current.cy;

    if (imageWidth <= 0 || imageHeight <= 0) {
      throw new AppError('INVALID_CALIBRATION', 'Image dimensions must be positive');
    }
    if (fx <= 0 || fy <= 0) {
      throw new AppError('INVALID_CALIBRATION', 'Focal length parameters fx and fy must be strictly positive');
    }
    if (cx < 0 || cx > imageWidth || cy < 0 || cy > imageHeight) {
      throw new AppError('INVALID_CALIBRATION', 'Principal point (cx, cy) must fall within image dimensions');
    }

    const newRecord: CameraCalibrationRecord = {
      ...current,
      ...updates,
      id: current.id,
      cameraId,
      imageWidth,
      imageHeight,
      fx,
      fy,
      cx,
      cy,
      version: current.version + 1,
      updatedAt: new Date(),
    };

    const saved = await calibrationRepository.upsert(newRecord);
    this.intrinsicsCache.delete(cameraId);

    if (userId) {
      await auditService.record({
        userId,
        action: 'CALIBRATION_UPDATED',
        resourceType: 'CAMERA',
        resourceId: cameraId,
        status: 'SUCCESS',
        details: {
          calibrationStatus: saved.calibrationStatus,
          version: saved.version,
          fx: saved.fx,
          fy: saved.fy,
        },
      });
    }

    return saved;
  }

  /**
   * Validates bounding box coordinates strictly.
   * Rejects malformed bounding boxes where x1 >= x2 or y1 >= y2.
   * Clamps sub-pixel edge anomalies gently to boundaries with audit warning.
   */
  validateBoundingBox(
    bbox: BoundingBox2D,
    imageWidth: number,
    imageHeight: number
  ): { x1: number; y1: number; x2: number; y2: number } {
    if (!bbox) {
      throw new AppError('INVALID_BBOX', 'Bounding box is missing');
    }

    const { x1, y1, x2, y2 } = bbox;

    if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') {
      throw new AppError('INVALID_BBOX', 'Bounding box coordinates must be numbers');
    }

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      throw new AppError('INVALID_BBOX', 'Bounding box coordinates cannot be NaN');
    }

    if (x2 <= x1 || y2 <= y1) {
      throw new AppError(
        'INVALID_BBOX',
        `INVALID_BBOX: Invalid bounding box dimensions: width (${x2 - x1}) and height (${y2 - y1}) must be positive`
      );
    }

    // Check if completely outside bounds
    if (x2 < 0 || x1 > imageWidth || y2 < 0 || y1 > imageHeight) {
      throw new AppError(
        'INVALID_BBOX',
        `INVALID_BBOX: Bounding box [${x1}, ${y1}, ${x2}, ${y2}] is completely outside image boundary [${imageWidth}x${imageHeight}]`
      );
    }

    // Clamp sub-pixel boundary intersections with logging
    const clampedX1 = Math.max(0, Math.min(x1, imageWidth));
    const clampedY1 = Math.max(0, Math.min(y1, imageHeight));
    const clampedX2 = Math.max(0, Math.min(x2, imageWidth));
    const clampedY2 = Math.max(0, Math.min(y2, imageHeight));

    if (clampedX2 <= clampedX1 || clampedY2 <= clampedY1) {
      throw new AppError('INVALID_BBOX', 'INVALID_BBOX: Bounding box degenerate after boundary validation');
    }

    return {
      x1: clampedX1,
      y1: clampedY1,
      x2: clampedX2,
      y2: clampedY2,
    };
  }

  /**
   * Pinhole Projection Model:
   * Maps 2D pixel coordinate -> Camera-space 3D Viewing Ray.
   * Coordinate conventions:
   *  - YOLO / Image space: Origin top-left, X right, Y down.
   *  - Three.js / Studio space: Origin center, X right, Y up, Z forward.
   */
  calculateCameraRay(
    pixelX: number,
    pixelY: number,
    intrinsics: { fx: number; fy: number; cx: number; cy: number },
    cameraOrigin: Vector3D | [number, number, number] = CCTV_DEFAULT_RIG_POSITION
  ): ViewingRay {
    const { fx, fy, cx, cy } = intrinsics;

    // 1. Convert pixel offset to normalized metric camera plane coordinates
    const xCam = (pixelX - cx) / fx;
    // Y inverted: in image space, top is 0 and bottom is H; in 3D world, +Y is UP!
    const yCam = -(pixelY - cy) / fy;
    const zCam = 1.0; // Forward optical axis

    // 2. Compute normalized unit direction vector
    const length = Math.sqrt(xCam * xCam + yCam * yCam + zCam * zCam);
    const dx = xCam / length;
    const dy = yCam / length;
    const dz = zCam / length;

    const ox = (cameraOrigin as any).x !== undefined ? (cameraOrigin as any).x : (cameraOrigin as any)[0];
    const oy = (cameraOrigin as any).y !== undefined ? (cameraOrigin as any).y : (cameraOrigin as any)[1];
    const oz = (cameraOrigin as any).z !== undefined ? (cameraOrigin as any).z : (cameraOrigin as any)[2];

    return {
      origin: { x: ox, y: oy, z: oz },
      direction: { x: dx, y: dy, z: dz },
    };
  }

  /**
   * Calculate Mechanical CCTV Pan (Yaw) & Tilt (Pitch) Angles
   * from 3D direction ray:
   *  - Pan (Yaw) rotates around Y axis: atan2(dx, dz)
   *  - Tilt (Pitch) rotates around X axis: positive = pitch DOWN towards target
   */
  calculateCctvAimingAngles(direction: Vector3D | [number, number, number]): {
    yaw: number;
    pitch: number;
    yawRad: number;
    pitchRad: number;
    yawDeg: number;
    pitchDeg: number;
  } {
    const dx = (direction as any).x !== undefined ? (direction as any).x : (direction as any)[0];
    const dy = (direction as any).y !== undefined ? (direction as any).y : (direction as any)[1];
    const dz = (direction as any).z !== undefined ? (direction as any).z : (direction as any)[2];

    // Azimuth / Yaw in horizontal XZ plane
    const yawRad = Math.atan2(dx, dz);
    const yawDeg = (yawRad * 180) / Math.PI;

    // Elevation / Pitch
    // CinematicCCTVCamera convention: positive tilt angle pitches DOWNWARDS
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
   * MODE B: Ray-Plane Intersection
   * Mathematical intersection of 3D viewing ray with a physical scene plane.
   * If ray is parallel or intersects behind the camera -> NO_INTERSECTION
   * If intersection falls outside configured plane perimeter -> OUT_OF_BOUNDS
   */
  intersectRayWithPlane(ray: ViewingRay, plane: ScenePlane = DEFAULT_DESK_PLANE): PlaneIntersectionResult {
    const rx = ray.origin.x !== undefined ? ray.origin.x : (ray.origin as any)[0];
    const ry = ray.origin.y !== undefined ? ray.origin.y : (ray.origin as any)[1];
    const rz = ray.origin.z !== undefined ? ray.origin.z : (ray.origin as any)[2];

    const dx = ray.direction.x !== undefined ? ray.direction.x : (ray.direction as any)[0];
    const dy = ray.direction.y !== undefined ? ray.direction.y : (ray.direction as any)[1];
    const dz = ray.direction.z !== undefined ? ray.direction.z : (ray.direction as any)[2];

    const nx = (plane.normal as any).x !== undefined ? (plane.normal as any).x : (plane.normal as any)[0];
    const ny = (plane.normal as any).y !== undefined ? (plane.normal as any).y : (plane.normal as any)[1];
    const nz = (plane.normal as any).z !== undefined ? (plane.normal as any).z : (plane.normal as any)[2];

    // Dot product between ray direction and plane normal
    const denom = dx * nx + dy * ny + dz * nz;

    // Ray is parallel or nearly parallel to plane
    if (Math.abs(denom) < 1e-6) {
      return {
        status: 'NO_INTERSECTION',
        point: null,
        distance: null,
        planeName: plane.name,
      };
    }

    // Determine plane equation offset: either from constant or from pointOnPlane
    let t: number;
    if (plane.constant !== undefined) {
      // Plane equation: nx*x + ny*y + nz*z + constant = 0 => t = -(n . r0 + constant) / (n . d)
      const nDotR0 = nx * rx + ny * ry + nz * rz;
      t = -(nDotR0 + plane.constant) / denom;
    } else if (plane.pointOnPlane) {
      const px = (plane.pointOnPlane as any).x !== undefined ? (plane.pointOnPlane as any).x : (plane.pointOnPlane as any)[0];
      const py = (plane.pointOnPlane as any).y !== undefined ? (plane.pointOnPlane as any).y : (plane.pointOnPlane as any)[1];
      const pz = (plane.pointOnPlane as any).z !== undefined ? (plane.pointOnPlane as any).z : (plane.pointOnPlane as any)[2];
      const numer = (px - rx) * nx + (py - ry) * ny + (pz - rz) * nz;
      t = numer / denom;
    } else {
      return {
        status: 'NO_INTERSECTION',
        point: null,
        distance: null,
        planeName: plane.name,
      };
    }

    // If intersection is behind ray origin
    if (t <= 0) {
      return {
        status: 'NO_INTERSECTION',
        point: null,
        distance: null,
        planeName: plane.name,
      };
    }

    // 3D intersection coordinates
    const ix = rx + t * dx;
    const iy = ry + t * dy;
    const iz = rz + t * dz;

    // Check boundary constraint if configured
    if (plane.bounds) {
      const { minX, maxX, minY, maxY, minZ, maxZ } = plane.bounds;
      if (minX !== undefined && ix < minX) return { status: 'OUT_OF_BOUNDS', point: { x: ix, y: iy, z: iz }, distance: t, planeName: plane.name };
      if (maxX !== undefined && ix > maxX) return { status: 'OUT_OF_BOUNDS', point: { x: ix, y: iy, z: iz }, distance: t, planeName: plane.name };
      if (minY !== undefined && iy < minY) return { status: 'OUT_OF_BOUNDS', point: { x: ix, y: iy, z: iz }, distance: t, planeName: plane.name };
      if (maxY !== undefined && iy > maxY) return { status: 'OUT_OF_BOUNDS', point: { x: ix, y: iy, z: iz }, distance: t, planeName: plane.name };
      if (minZ !== undefined && iz < minZ) return { status: 'OUT_OF_BOUNDS', point: { x: ix, y: iy, z: iz }, distance: t, planeName: plane.name };
      if (maxZ !== undefined && iz > maxZ) return { status: 'OUT_OF_BOUNDS', point: { x: ix, y: iy, z: iz }, distance: t, planeName: plane.name };
    }

    return {
      status: 'INTERSECTED',
      point: { x: ix, y: iy, z: iz },
      distance: t,
      planeName: plane.name,
    };
  }

  /**
   * Main 2D Detection -> 3D Visualization Target Mapping Pipeline:
   * Connects YOLO 2D Bounding Box to Three.js CCTV Aiming and Ray Projection.
   */
  async mapDetectionTo3D(
    detection: Detection2DInput,
    cameraId: string,
    mode: LocalizationMode = 'RAY_ONLY',
    customPlane?: ScenePlane
  ): Promise<VisualizationTarget> {
    const calibration = await this.getCalibration(cameraId);

    // 1. Validate bounding box
    const validBbox = this.validateBoundingBox(
      detection.bbox,
      detection.imageWidth || calibration.imageWidth,
      detection.imageHeight || calibration.imageHeight
    );

    // 2. Compute 2D optical center in pixels
    const centerX = (validBbox.x1 + validBbox.x2) / 2;
    const centerY = (validBbox.y1 + validBbox.y2) / 2;

    // 3. Compute normalized image coordinates [0.0, 1.0]
    const u = centerX / (detection.imageWidth || calibration.imageWidth);
    const v = centerY / (detection.imageHeight || calibration.imageHeight);

    // 4. Calculate Pinhole Viewing Ray
    const ray = this.calculateCameraRay(
      centerX,
      centerY,
      {
        fx: calibration.fx,
        fy: calibration.fy,
        cx: calibration.cx,
        cy: calibration.cy,
      },
      CCTV_DEFAULT_RIG_POSITION
    );

    // 5. Calculate mechanical Pan/Tilt angles for CCTV rig
    const desiredAngles = this.calculateCctvAimingAngles(ray.direction);

    // 6. Handle Localization Mode
    let worldPosition: Vector3D | null = null;
    let planeIntersection: PlaneIntersectionResult | null = null;

    if (mode === 'PLANE_INTERSECTION') {
      planeIntersection = this.intersectRayWithPlane(ray, customPlane || DEFAULT_DESK_PLANE);
      if (planeIntersection.status === 'INTERSECTED' && planeIntersection.point) {
        worldPosition = planeIntersection.point;
      }
    } else if (mode === 'DEPTH') {
      // Reserved for depth sensor - without depth sensor, do not invent fake 3D position
      worldPosition = null;
    } else {
      // Default: RAY_ONLY (Technically honest: 3D ray is known, 3D world point is UNKNOWN)
      worldPosition = null;
    }

    return {
      cameraId,
      trackId: detection.trackId ?? null,
      className: detection.className || 'target',
      confidence: detection.confidence || 0.0,
      imagePoint: {
        x: Math.round(centerX),
        y: Math.round(centerY),
      },
      normalizedPoint: {
        u: Number(u.toFixed(4)),
        v: Number(v.toFixed(4)),
      },
      ray,
      desiredAngles,
      localizationMode: mode,
      calibrationStatus: calibration.calibrationStatus,
      worldPosition,
      worldPoint: worldPosition || undefined,
      planeIntersection,
    };
  }
}

export const cameraCalibrationService = new CameraCalibrationService();
