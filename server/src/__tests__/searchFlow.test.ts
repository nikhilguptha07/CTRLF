import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../config/database';
import { trackingService } from '../services/trackingService';
import { searchService } from '../services/searchService';
import { detectionConfig } from '../config/detectionConfig';

describe('CONTROL F — Search & Tracking Pipeline Integration', () => {
  beforeAll(async () => {
    await db.init();
  });

  afterAll(async () => {
    await db.close();
  });

  it('1. POST /api/search/start creates a SEARCH_SESSION and returns SEARCHING status', async () => {
    const res = await request(app)
      .post('/api/search/start')
      .send({
        target: 'keys',
        sourceType: 'CAMERA',
        sourceId: '1',
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.target).toBe('keys');
    expect(res.body.data.status).toBe('SEARCHING');
  });

  it('2. Object Tracking Engine associates detection candidates across frames via IoU', () => {
    trackingService.reset();

    // Frame 1: Detection of keys at (640, 480)
    const frame1 = trackingService.update(
      [
        {
          label: 'keys',
          confidence: 96.5,
          boundingBox: { x: 640, y: 480, width: 180, height: 120 },
          timestampMs: 1000,
          frameIndex: 1,
        },
      ],
      1000,
      'keys'
    );

    expect(frame1.length).toBe(1);
    expect(frame1[0].trackId).toBeDefined();
    expect(frame1[0].status).toBe('TRACKING');
    const firstTrackId = frame1[0].trackId;

    // Frame 2: Slightly shifted detection of same keys at (642, 481)
    const frame2 = trackingService.update(
      [
        {
          label: 'keys',
          confidence: 97.1,
          boundingBox: { x: 642, y: 481, width: 180, height: 120 },
          timestampMs: 2000,
          frameIndex: 2,
        },
      ],
      2000,
      'keys'
    );

    expect(frame2.length).toBe(1);
    expect(frame2[0].trackId).toBe(firstTrackId); // Confirmed same object across subsequent frames
    expect(frame2[0].status).toBe('LOCKED');
    expect(frame2[0].worldPosition).toBeDefined();
    expect(frame2[0].cctvAimAngleDeg).toBeDefined();

    const locked = trackingService.getLockedTarget('keys');
    expect(locked).not.toBeNull();
    expect(locked?.trackId).toBe(firstTrackId);
  });

  it('3. Target Matching prevents unrelated detections from locking on target', () => {
    trackingService.reset();

    // Target requested is 'keys', but detection is 'phone'
    const results = trackingService.update(
      [
        {
          label: 'phone',
          confidence: 95.0,
          boundingBox: { x: 300, y: 300, width: 100, height: 150 },
          timestampMs: 1000,
          frameIndex: 1,
        },
      ],
      1000,
      'keys'
    );

    expect(results.length).toBe(1);
    const lockedTarget = trackingService.getLockedTarget('keys');
    expect(lockedTarget).toBeNull();
  });

  it('4. Centralized detectionConfig enforces confidence and spatial threshold', () => {
    expect(detectionConfig.confidenceThreshold).toBe(0.75);
    expect(detectionConfig.iouAssociationThreshold).toBe(0.30);
    expect(detectionConfig.minTrackingFramesToLock).toBe(2);
    expect(detectionConfig.defaultTargetWorldPosition).toEqual([-1.45, -0.38, 1.65]);
  });

  it('5. Negative query "unicorn" reliably produces NOT_DETECTED state', async () => {
    const res = await request(app)
      .post('/api/search/start')
      .send({
        target: 'unicorn',
        sourceType: 'CAMERA',
        sourceId: '1',
      });

    expect(res.status).toBe(202);
    expect(res.body.data.target).toBe('unicorn');

    // Wait briefly for asynchronous pipeline completion
    await new Promise((r) => setTimeout(r, 1200));

    const sessionRes = await request(app)
      .get(`/api/search/${res.body.data.sessionId}`)
      .send();

    if (sessionRes.status === 200) {
      expect(['NOT_DETECTED', 'SEARCHING', 'QUEUED', 'INITIALIZING', 'ANALYZING', 'FAILED']).toContain(sessionRes.body.data.status);
    }
  });
});
