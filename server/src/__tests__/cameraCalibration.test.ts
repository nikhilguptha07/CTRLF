import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../config/database';
import { cameraCalibrationService } from '../services/cameraCalibrationService';
import { calibrationRepository } from '../repositories/calibrationRepository';
import { CameraCalibrationRecord, ScenePlane } from '../types/calibration';

describe('Phase 7 — Real Camera Calibration & 2D -> 3D Visualization Tests', () => {
  const TEST_CAM_ID = 'CAM_TEST_CALIB';
  const SYNTHETIC_INTRINSICS: Omit<CameraCalibrationRecord, 'id' | 'createdAt' | 'updatedAt'> = {
    cameraId: TEST_CAM_ID,
    imageWidth: 1920,
    imageHeight: 1080,
    fx: 1400.0,
    fy: 1400.0,
    cx: 960.0,
    cy: 540.0,
    distortionModel: 'NONE',
    distortionCoefficients: [0, 0, 0, 0, 0],
    calibrationStatus: 'ESTIMATED',
    localizationMode: 'RAY_ONLY',
    version: 1,
  };

  beforeAll(async () => {
    await db.init();
    // Seed test camera calibration
    await calibrationRepository.upsert(SYNTHETIC_INTRINSICS);
  });

  afterAll(async () => {
    await db.close();
  });

  // ==========================================
  // TEST 1: Detection at image center
  // Expected: ray aligned with optical axis
  // ==========================================
  it('TEST 1: Center pixel detection produces ray aligned with optical axis', async () => {
    const target = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 910, y1: 490, x2: 1010, y2: 590 }, // Center is (960, 540)
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'person',
        confidence: 0.941,
        trackId: 101,
      },
      TEST_CAM_ID,
      'RAY_ONLY'
    );

    expect(target).toBeDefined();
    expect(target.imagePoint.x).toBe(960);
    expect(target.imagePoint.y).toBe(540);
    expect(target.normalizedPoint.u).toBeCloseTo(0.5, 4);
    expect(target.normalizedPoint.v).toBeCloseTo(0.5, 4);

    // Optical axis points along +Z in camera frame
    expect(target.ray.direction.x).toBeCloseTo(0, 3);
    expect(target.ray.direction.y).toBeCloseTo(0, 3);
    expect(target.ray.direction.z).toBeCloseTo(1, 3);

    // Desired angles close to 0
    expect(target.desiredAngles.yaw).toBeCloseTo(0, 2);
    expect(target.desiredAngles.pitch).toBeCloseTo(0, 2);
    expect(target.confidence).toBe(0.941);
    expect(target.trackId).toBe(101);
  });

  // ==========================================
  // TEST 2: Detection at top-left
  // Expected: ray points upper-left (dx < 0, dy > 0 in Three.js world Y up)
  // ==========================================
  it('TEST 2: Top-left detection produces upper-left viewing ray', async () => {
    const target = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 100, y1: 50, x2: 300, y2: 150 }, // Center: (200, 100)
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'person',
        confidence: 0.88,
        trackId: 102,
      },
      TEST_CAM_ID,
      'RAY_ONLY'
    );

    expect(target.imagePoint.x).toBe(200);
    expect(target.imagePoint.y).toBe(100);
    // x < cx (960) -> dx must be negative (left)
    expect(target.ray.direction.x).toBeLessThan(0);
    // y < cy (540) in image coordinates (top) -> in Three.js world Y up, dy must be positive (upper)
    expect(target.ray.direction.y).toBeGreaterThan(0);
    // Camera yaw should be negative (turned left)
    expect(target.desiredAngles.yaw).toBeLessThan(0);
  });

  // ==========================================
  // TEST 3: Detection at top-right
  // Expected: ray points upper-right (dx > 0, dy > 0)
  // ==========================================
  it('TEST 3: Top-right detection produces upper-right viewing ray', async () => {
    const target = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 1600, y1: 50, x2: 1800, y2: 150 }, // Center: (1700, 100)
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'backpack',
        confidence: 0.91,
        trackId: 103,
      },
      TEST_CAM_ID,
      'RAY_ONLY'
    );

    expect(target.imagePoint.x).toBe(1700);
    expect(target.imagePoint.y).toBe(100);
    // x > cx (960) -> dx must be positive (right)
    expect(target.ray.direction.x).toBeGreaterThan(0);
    // y < cy (540) -> dy must be positive (upper)
    expect(target.ray.direction.y).toBeGreaterThan(0);
    // Yaw should be positive (turned right)
    expect(target.desiredAngles.yaw).toBeGreaterThan(0);
  });

  // ==========================================
  // TEST 4: Detection at bottom-left
  // Expected: ray points lower-left (dx < 0, dy < 0)
  // ==========================================
  it('TEST 4: Bottom-left detection produces lower-left viewing ray', async () => {
    const target = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 100, y1: 900, x2: 300, y2: 1000 }, // Center: (200, 950)
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'cell phone',
        confidence: 0.85,
        trackId: 104,
      },
      TEST_CAM_ID,
      'RAY_ONLY'
    );

    expect(target.imagePoint.x).toBe(200);
    expect(target.imagePoint.y).toBe(950);
    // x < cx (960) -> dx < 0 (left)
    expect(target.ray.direction.x).toBeLessThan(0);
    // y > cy (540) -> dy < 0 (lower)
    expect(target.ray.direction.y).toBeLessThan(0);
    expect(target.desiredAngles.yaw).toBeLessThan(0);
    // Pitch should be positive (tilted downwards)
    expect(target.desiredAngles.pitch).toBeGreaterThan(0);
  });

  // ==========================================
  // TEST 5: Detection at bottom-right
  // Expected: ray points lower-right (dx > 0, dy < 0)
  // ==========================================
  it('TEST 5: Bottom-right detection produces lower-right viewing ray', async () => {
    const target = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 1600, y1: 900, x2: 1800, y2: 1000 }, // Center: (1700, 950)
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'laptop',
        confidence: 0.95,
        trackId: 105,
      },
      TEST_CAM_ID,
      'RAY_ONLY'
    );

    expect(target.imagePoint.x).toBe(1700);
    expect(target.imagePoint.y).toBe(950);
    // x > cx (960) -> dx > 0 (right)
    expect(target.ray.direction.x).toBeGreaterThan(0);
    // y > cy (540) -> dy < 0 (lower)
    expect(target.ray.direction.y).toBeLessThan(0);
    expect(target.desiredAngles.yaw).toBeGreaterThan(0);
    expect(target.desiredAngles.pitch).toBeGreaterThan(0);
  });

  // ==========================================
  // TEST 6: Invalid bounding box
  // Expected: mapping failure / validation rejection
  // ==========================================
  it('TEST 6: Invalid bounding box throws validation error and rejects mapping', async () => {
    // Inverted coordinates: x1 > x2
    await expect(
      cameraCalibrationService.mapDetectionTo3D(
        {
          bbox: { x1: 500, y1: 200, x2: 300, y2: 400 },
          imageWidth: 1920,
          imageHeight: 1080,
          className: 'person',
          confidence: 0.9,
        },
        TEST_CAM_ID
      )
    ).rejects.toThrow('INVALID_BBOX');

    // Negative coordinates beyond clamping bounds
    await expect(
      cameraCalibrationService.mapDetectionTo3D(
        {
          bbox: { x1: -50, y1: 100, x2: -10, y2: 300 },
          imageWidth: 1920,
          imageHeight: 1080,
          className: 'person',
          confidence: 0.9,
        },
        TEST_CAM_ID
      )
    ).rejects.toThrow('INVALID_BBOX');
  });

  // ==========================================
  // TEST 7: Missing calibration
  // Expected: explicit UNCALIBRATED status returned
  // ==========================================
  it('TEST 7: Missing camera calibration returns explicit UNCALIBRATED status', async () => {
    const uncalibCam = await cameraCalibrationService.getCalibration('CAM_UNCONFIGURED_99');
    expect(uncalibCam.calibrationStatus).toBe('UNCALIBRATED');
    expect(uncalibCam.localizationMode).toBe('RAY_ONLY');
    expect(uncalibCam.cameraId).toBe('CAM_UNCONFIGURED_99');
  });

  // ==========================================
  // TEST 8: Plane intersection
  // Expected: correct mathematical intersection
  // ==========================================
  it('TEST 8: Ray intersects configured scene plane with accurate coordinates', async () => {
    // Ground plane at y = -0.5, pointing up normal (0, 1, 0)
    const deskPlane: ScenePlane = {
      name: 'deskPlane',
      normal: { x: 0, y: 1, z: 0 },
      constant: 0.5, // plane equation: 0*x + 1*y + 0*z + 0.5 = 0 -> y = -0.5
      bounds: {
        minX: -5.0,
        maxX: 5.0,
        minY: -1.0,
        maxY: 1.0,
        minZ: 0.1,
        maxZ: 10.0,
      },
    };

    // Detection in lower half (y = 800 > cy 540) pointing downwards (dy < 0)
    const target = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 910, y1: 750, x2: 1010, y2: 850 }, // Center: (960, 800)
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'keys',
        confidence: 0.93,
        trackId: 108,
      },
      TEST_CAM_ID,
      'PLANE_INTERSECTION',
      deskPlane
    );

    expect(target.localizationMode).toBe('PLANE_INTERSECTION');
    expect(target.planeIntersection).toBeDefined();
    expect(target.planeIntersection?.status).toBe('INTERSECTED');
    expect(target.planeIntersection?.point).toBeDefined();
    // Intersection Y must exactly match plane Y = -0.5
    expect(target.planeIntersection?.point?.y).toBeCloseTo(-0.5, 3);
    // Intersection Z must be in front of camera
    expect(target.planeIntersection?.point?.z).toBeGreaterThan(0);
    // Estimated world point must equal plane intersection point
    expect(target.worldPoint?.y).toBeCloseTo(-0.5, 3);
  });

  // ==========================================
  // TEST 9: No plane intersection
  // Expected: NO_INTERSECTION or OUT_OF_BOUNDS
  // ==========================================
  it('TEST 9: Ray pointing away from plane returns NO_INTERSECTION without fake coordinates', async () => {
    // Ground plane at y = -0.5 (below camera)
    const groundPlane: ScenePlane = {
      name: 'groundPlane',
      normal: { x: 0, y: 1, z: 0 },
      constant: 0.5, // y = -0.5
    };

    // Detection in top half (y = 100 < cy 540) pointing upwards (dy > 0, away from y = -0.5)
    const target = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 910, y1: 50, x2: 1010, y2: 150 },
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'bird',
        confidence: 0.81,
        trackId: 109,
      },
      TEST_CAM_ID,
      'PLANE_INTERSECTION',
      groundPlane
    );

    expect(target.planeIntersection).toBeDefined();
    expect(target.planeIntersection?.status).toBe('NO_INTERSECTION');
    // Technically honest: without intersection, worldPoint must be undefined
    expect(target.worldPoint).toBeUndefined();
    // Ray remains valid
    expect(target.ray.direction.z).toBeGreaterThan(0);
  });

  // ==========================================
  // TEST 10: Track update consistency
  // Expected: same track ID drives visualization and preserves confidence
  // ==========================================
  it('TEST 10: Track ID and YOLO confidence are preserved without modification', async () => {
    const rawConfidence = 0.941;
    const testTrackId = 77;

    const frame1 = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 800, y1: 400, x2: 900, y2: 500 },
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'person',
        confidence: rawConfidence,
        trackId: testTrackId,
      },
      TEST_CAM_ID
    );

    const frame2 = await cameraCalibrationService.mapDetectionTo3D(
      {
        bbox: { x1: 820, y1: 410, x2: 920, y2: 510 },
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'person',
        confidence: rawConfidence,
        trackId: testTrackId,
      },
      TEST_CAM_ID
    );

    expect(frame1.trackId).toBe(testTrackId);
    expect(frame2.trackId).toBe(testTrackId);
    expect(frame1.confidence).toBe(0.941);
    expect(frame2.confidence).toBe(0.941);
    expect(frame1.trackId).toBe(frame2.trackId);
  });

  // ==========================================
  // API Integration: GET & PUT /api/cameras/:cameraId/calibration
  // ==========================================
  it('API: GET /api/cameras/:cameraId/calibration returns calibration metadata', async () => {
    const res = await request(app).get(`/api/cameras/${TEST_CAM_ID}/calibration`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cameraId).toBe(TEST_CAM_ID);
    expect(res.body.data.resolution.width).toBe(1920);
    expect(res.body.data.resolution.height).toBe(1080);
    expect(res.body.data.intrinsics.fx).toBe(1400);
    expect(res.body.data.distortion.model).toBe('NONE');
    expect(res.body.data.calibrationStatus).toBe('ESTIMATED');
    expect(res.body.data.extrinsics.status).toBe('EXTRINSICS_UNCALIBRATED');
  });

  it('API: POST /api/cameras/:cameraId/calibration/map-detection converts bbox to ray', async () => {
    const res = await request(app)
      .post(`/api/cameras/${TEST_CAM_ID}/calibration/map-detection`)
      .send({
        bbox: { x1: 900, y1: 500, x2: 1020, y2: 580 },
        imageWidth: 1920,
        imageHeight: 1080,
        className: 'person',
        confidence: 0.941,
        trackId: 12,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.imagePoint.x).toBe(960);
    expect(res.body.data.imagePoint.y).toBe(540);
    expect(res.body.data.ray.direction.z).toBeCloseTo(1, 3);
    expect(res.body.data.trackId).toBe(12);
    expect(res.body.data.confidence).toBe(0.941);
  });
});
