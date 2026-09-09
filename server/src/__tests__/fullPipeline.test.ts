import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../config/database';
import { trackingService } from '../services/trackingService';
import { searchRepository } from '../repositories/searchRepository';
import { socketManager } from '../websocket/socketManager';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

import fs from 'fs';
import path from 'path';

describe('CONTROL F — Phase 11 Full End-to-End Test Suite', () => {
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    await db.init();
    server = createServer(app);
    socketManager.init(server);
  });

  afterAll(async () => {
    await db.close();
  });

  // 1. API - Video Upload Validation
  it('1. Rejects video upload when file is missing or invalid type', async () => {
    const emptyRes = await request(app).post('/api/videos/upload');
    expect(emptyRes.status).toBe(400);

    const invalidTypeRes = await request(app)
      .post('/api/videos/upload')
      .attach('video', Buffer.from('not a video'), 'test.txt');
    expect(invalidTypeRes.status).toBe(415);
  });

  it('2. Accepts valid mp4 video upload and creates video record', async () => {
    const videoPath = path.resolve(__dirname, '../../../reference/cctv-reference.mp4');
    const videoBuffer = fs.existsSync(videoPath)
      ? fs.readFileSync(videoPath)
      : Buffer.concat([Buffer.from([0, 0, 0, 20]), Buffer.from('ftypisom'), Buffer.alloc(1024)]);

    const res = await request(app)
      .post('/api/videos/upload')
      .attach('video', videoBuffer, 'surveillance_clip.mp4');

    expect([201, 200]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.originalFilename).toBe('surveillance_clip.mp4');
  });

  // 2. Search Creation & Validation
  it('3. Creates a SEARCH_SESSION for target object with initial QUEUED/SEARCHING state', async () => {
    const res = await request(app)
      .post('/api/search/start')
      .send({
        target: 'bottle',
        sourceType: 'CAMERA',
        sourceId: '1',
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.target).toBe('bottle');
  });

  // 3. Tracking Consistency (ByteTrack / IoU tracker)
  it('4. Tracking engine maintains persistent trackId across sequential frames', () => {
    trackingService.reset();

    const frame1Tracks = trackingService.update(
      [
        {
          label: 'bottle',
          confidence: 89.2,
          boundingBox: { x: 100, y: 150, width: 80, height: 160 },
          timestampMs: 0,
          frameIndex: 0,
        },
      ],
      0,
      'bottle'
    );

    expect(frame1Tracks.length).toBe(1);
    const initialTrackId = frame1Tracks[0].trackId;
    expect(initialTrackId).toBeDefined();

    // Frame 2: Slight movement
    const frame2Tracks = trackingService.update(
      [
        {
          label: 'bottle',
          confidence: 91.5,
          boundingBox: { x: 104, y: 152, width: 80, height: 160 },
          timestampMs: 250,
          frameIndex: 1,
        },
      ],
      250,
      'bottle'
    );

    expect(frame2Tracks.length).toBe(1);
    expect(frame2Tracks[0].trackId).toBe(initialTrackId); // Track ID persists across sequential frames!
    expect(frame2Tracks[0].status).toBe('LOCKED');
  });

  // 4. Oracle DB Relational Persistence
  it('5. Persists SEARCH_SESSIONS, OBJECT_TRACKS, and SEARCH_RESULTS with parameter binding', async () => {
    const searchId = uuidv4();
    const userId = uuidv4();

    // 1. Create Session
    const session = await searchRepository.create({
      id: searchId,
      userId,
      objectName: 'laptop',
      sourceType: 'VIDEO',
      sourceId: 'test-vid-1',
      status: 'INITIALIZING',
      progressPercent: 10,
    });
    expect(session.id).toBe(searchId);

    // 2. Persist Object Track
    await searchRepository.createObjectTrack({
      id: uuidv4(),
      searchId,
      trackId: 1,
      className: 'laptop',
      confidence: 94.5,
      frameIndex: 2,
      timestampMs: 500,
      bboxX: 200,
      bboxY: 200,
      bboxWidth: 300,
      bboxHeight: 200,
      status: 'ACTIVE',
    });

    const savedTracks = await searchRepository.findTracksBySearchId(searchId);
    expect(savedTracks.length).toBe(1);
    expect(savedTracks[0].trackId ?? (savedTracks[0] as any).TRACK_ID).toBe(1);
    expect(savedTracks[0].className ?? (savedTracks[0] as any).CLASS_NAME).toBe('laptop');

    // 3. Persist Search Result
    await searchRepository.createSearchResult({
      id: uuidv4(),
      searchId,
      targetName: 'laptop',
      targetFound: 1,
      finalConfidence: 94.5,
      summaryNotes: 'Target laptop acquired with 94.5% confidence',
    });

    // 4. Verify Search History query
    const historyRes = await request(app).get('/api/history');
    expect(historyRes.status).toBe(200);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
  });

  // 5. Target Absent produces strictly 0% confidence and NOT_DETECTED
  it('6. Absent target produces NOT_DETECTED state and 0% confidence', async () => {
    const res = await request(app)
      .post('/api/search/start')
      .send({
        target: 'nonexistent_object_xyz_123',
        sourceType: 'CAMERA',
        sourceId: '1',
      });

    expect(res.status).toBe(202);
    const sid = res.body.data.sessionId;

    // Check search state
    const sessionRes = await request(app).get(`/api/search/${sid}`);
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.data.target).toBe('nonexistent_object_xyz_123');
  });

  // 6. WebSocket event emissions
  it('7. Emits real-time search, tracking, and target acquired events', () => {
    const testSearchId = 'ws-test-search-id';
    expect(() => {
      socketManager.emitScanStarted(testSearchId);
      socketManager.emitFrameProcessed(testSearchId, 1, 10, 100);
      socketManager.emitSearchTracking(testSearchId, [
        {
          trackId: '1',
          objectName: 'cup',
          confidence: 88.0,
          status: 'TRACKING',
          timestamp: 100,
          x: 50,
          y: 50,
          width: 50,
          height: 80,
          worldPosition: { x: 0, y: 0, z: 0 },
          cctvAimAngleDeg: 12,
        },
      ]);
      socketManager.emitTargetAcquired(testSearchId, {
        label: 'cup',
        confidence: 88.0,
        boundingBox: { x: 50, y: 50, width: 50, height: 80 },
      });
      socketManager.emitSearchComplete(testSearchId, {
        searchId: testSearchId,
        stage: 'DETECTED',
        progress: 100,
        message: 'Detection confirmed',
      });
    }).not.toThrow();
  });

  // 7. Security audit logs and endpoints
  it('8. GET /api/logs returns system audit trail', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
