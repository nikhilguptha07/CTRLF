import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../app';
import { db } from '../config/database';
import { searchService } from '../services/searchService';
import { searchRepository } from '../repositories/searchRepository';
import { evidenceRepository } from '../repositories/evidenceRepository';
import { videoValidationService } from '../services/videoValidationService';
import { socketManager } from '../websocket/socketManager';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

describe('PHASE 5 — Production Video Processing & Evidence Pipeline Suite', () => {
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    await db.init();
    server = createServer(app);
    socketManager.init(server);
  });

  afterAll(async () => {
    await db.close();
  });

  // =========================================================================
  // 1. VIDEO UPLOAD & SECURITY VALIDATION
  // =========================================================================
  describe('1. Video Upload & Security Validation', () => {
    it('rejects empty file uploads with 400', async () => {
      const res = await request(app).post('/api/videos/upload');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects forbidden file extensions (e.g. .exe, .sh, .txt) with 415', async () => {
      const res = await request(app)
        .post('/api/videos/upload')
        .attach('video', Buffer.from('malicious binary content'), 'trojan.exe');

      expect(res.status).toBe(415);
      expect(res.body.error?.message).toMatch(/INVALID_EXTENSION|Unsupported file extension|Invalid file type/);
    });

    it('rejects corrupt video magic bytes with 400', async () => {
      // Named as mp4 but without genuine container signature
      const corruptData = Buffer.from('This is pure ASCII text masquerading as video content.');
      const res = await request(app)
        .post('/api/videos/upload')
        .attach('video', corruptData, 'fake_corrupt.mp4');

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/CORRUPT_VIDEO_HEADER|header signature/);
    });

    it('validates genuine MP4 container and computes SHA-256 hash', async () => {
      const videoPath = path.resolve(__dirname, '../../../reference/cctv-reference.mp4');
      const videoBuffer = fs.existsSync(videoPath)
        ? fs.readFileSync(videoPath)
        : Buffer.concat([Buffer.from([0, 0, 0, 20]), Buffer.from('ftypisom'), Buffer.alloc(1024)]);

      const validation = await videoValidationService.validateAndExtractMetadata(
        'cctv-reference.mp4',
        'video/mp4',
        videoBuffer
      );

      expect(validation.sha256Checksum).toBeDefined();
      expect(validation.sha256Checksum.length).toBe(64); // SHA-256 is 64 hex characters
      expect(validation.durationSeconds).toBeGreaterThan(0);
      expect(validation.frameRate).toBeGreaterThan(0);
      expect(validation.width).toBeGreaterThan(0);
      expect(validation.height).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 2. NON-BLOCKING ASYNC SEARCH INITIATION & STATE MACHINE
  // =========================================================================
  describe('2. Non-blocking Search Job State Machine', () => {
    it('POST /api/search returns 202 Accepted immediately without blocking', async () => {
      const startTime = Date.now();
      const res = await request(app)
        .post('/api/search')
        .send({
          target: 'bottle',
          objectName: 'bottle',
          sourceType: 'CAMERA',
          sourceId: '1',
        });

      const responseDurationMs = Date.now() - startTime;

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.status).toBe('QUEUED');
      // Must return immediately (< 1000ms) rather than blocking for full video processing
      expect(responseDurationMs).toBeLessThan(1000);
    });

    it('GET /api/search/:searchId returns session details', async () => {
      const createRes = await request(app)
        .post('/api/search')
        .send({
          target: 'cup',
          objectName: 'cup',
          sourceType: 'CAMERA',
          sourceId: '1',
        });

      const sessionId = createRes.body.data.sessionId;

      const getRes = await request(app).get(`/api/search/${sessionId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.id).toBe(sessionId);
      expect(getRes.body.data.objectName).toBe('cup');
    });

    it('GET /api/search/:searchId/progress provides real-time progress details', async () => {
      const createRes = await request(app)
        .post('/api/search')
        .send({
          target: 'bottle',
          objectName: 'bottle',
          sourceType: 'CAMERA',
          sourceId: '1',
        });

      const sessionId = createRes.body.data.sessionId;

      const progRes = await request(app).get(`/api/search/${sessionId}/progress`);
      expect(progRes.status).toBe(200);
      expect(progRes.body.data.sessionId).toBe(sessionId);
      expect(progRes.body.data.progressPercent).toBeDefined();
    });
  });

  // =========================================================================
  // 3. SEARCH CANCELLATION
  // =========================================================================
  describe('3. Search Cancellation', () => {
    it('POST /api/search/:searchId/cancel cleanly cancels an in-flight search', async () => {
      const createRes = await request(app)
        .post('/api/search')
        .send({
          target: 'laptop',
          objectName: 'laptop',
          sourceType: 'CAMERA',
          sourceId: '1',
        });

      const sessionId = createRes.body.data.sessionId;

      const cancelRes = await request(app).post(`/api/search/${sessionId}/cancel`);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.success).toBe(true);

      // Verify status in repository
      const updated = await searchRepository.findById(sessionId);
      expect(updated?.status).toBe('CANCELLED');
    });
  });

  // =========================================================================
  // 4. EVIDENCE GENERATION & ORACLE PERSISTENCE
  // =========================================================================
  describe('4. Evidence Generation & Oracle Relational Persistence', () => {
    it('persists evidence files with highest_confidence selection policy', async () => {
      const testSessionId = uuidv4();
      const evidenceId = uuidv4();

      await searchRepository.create({
        id: testSessionId,
        userId: 'test-user',
        objectName: 'tv',
        sourceType: 'VIDEO',
        sourceId: 'vid-01',
        status: 'PROCESSING',
        progressPercent: 50,
      });

      const created = await evidenceRepository.create({
        id: evidenceId,
        sessionId: testSessionId,
        detectionId: null,
        trackId: 3,
        videoId: 'vid-01',
        frameNumber: 24,
        timestampMs: 800,
        originalImagePath: 'uploads/evidence/evidence_orig_sample_24.jpg',
        annotatedImagePath: 'uploads/evidence/evidence_annotated_sample_24.jpg',
        selectionPolicy: 'highest_confidence',
        confidence: 96.8,
      });

      expect(created.id).toBe(evidenceId);
      expect(created.selectionPolicy).toBe('highest_confidence');
      expect(created.confidence).toBe(96.8);

      const evidenceList = await evidenceRepository.findBySessionId(testSessionId);
      expect(evidenceList.length).toBe(1);
      expect(evidenceList[0].frameNumber).toBe(24);
      expect(evidenceList[0].trackId).toBe(3);
      expect(evidenceList[0].annotatedImagePath).toBe('uploads/evidence/evidence_annotated_sample_24.jpg');

      // Query via API endpoint
      const apiRes = await request(app).get(`/api/search/${testSessionId}/evidence`);
      expect(apiRes.status).toBe(200);
      expect(apiRes.body.data.length).toBe(1);
      expect(apiRes.body.data[0].id).toBe(evidenceId);
    });
  });

  // =========================================================================
  // 5. CRASH RECOVERY / STALE JOBS
  // =========================================================================
  describe('5. Crash Recovery & Stale Job Detection', () => {
    it('recoverStaleJobs() marks orphaned PROCESSING jobs as FAILED on startup', async () => {
      const orphanSessionId = uuidv4();

      await searchRepository.create({
        id: orphanSessionId,
        userId: 'test-user',
        objectName: 'stale-target',
        sourceType: 'VIDEO',
        sourceId: 'vid-orphan',
        status: 'PROCESSING',
        progressPercent: 45,
      });

      const recoveredCount = await db.recoverStaleJobs();
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const staleSession = await searchRepository.findById(orphanSessionId);
      expect(staleSession?.status).toBe('FAILED');
      expect(staleSession?.errorMessage).toMatch(/interrupted by server restart/);
    });
  });

  // =========================================================================
  // 6. REAL SEARCH HISTORY
  // =========================================================================
  describe('6. Authoritative Search History', () => {
    it('GET /api/search-history returns persistent records without mocks', async () => {
      const res = await request(app).get('/api/search-history');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
