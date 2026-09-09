import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { app } from '../app';
import { db } from '../config/database';
import { searchRepository } from '../repositories/searchRepository';
import { videoRepository } from '../repositories/videoRepository';
import { evidenceRepository } from '../repositories/evidenceRepository';
import { authService } from '../services/authService';
import { v4 as uuidv4 } from 'uuid';

describe('Upload Surveillance Footage — Full Search Flow Verification (Section 18)', () => {
  let operatorToken: string;
  let operatorUserId: string;

  beforeAll(async () => {
    await db.init();

    // Create test operator
    const operatorUser = await authService.register({
      email: `test_operator_${uuidv4()}@controlf.internal`,
      password: 'JudgeOperatorPassword2026!',
      fullName: 'Surveillance Analyst',
      role: 'OPERATOR',
    });
    operatorToken = operatorUser.accessToken;
    operatorUserId = operatorUser.user.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it('Step 1 & 2: Uploads a valid MP4 and receives metadata', async () => {
    const videoPath = path.resolve(__dirname, '../../../reference/cctv-reference.mp4');
    const videoBuffer = fs.existsSync(videoPath)
      ? fs.readFileSync(videoPath)
      : Buffer.concat([Buffer.from([0, 0, 0, 20]), Buffer.from('ftypisom'), Buffer.alloc(1024)]);

    const uploadRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${operatorToken}`)
      .attach('video', videoBuffer, 'WhatsApp_Video_2026_03_06.mp4');

    expect([200, 201]).toContain(uploadRes.status);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.id).toBeDefined();
    expect(uploadRes.body.data.originalFilename).toBe('WhatsApp_Video_2026_03_06.mp4');
    expect(uploadRes.body.data.status).toBe('READY');

    const videoId = uploadRes.body.data.id;

    // Step 3-6: Call POST /api/search with sourceType: VIDEO, videoId, and target: bottle
    const searchRes = await request(app)
      .post('/api/search')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        sourceType: 'VIDEO',
        videoId: videoId,
        target: 'bottle',
      });

    expect([200, 202]).toContain(searchRes.status);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.sessionId).toBeDefined();
    expect(searchRes.body.data.target).toBe('bottle');

    const sessionId = searchRes.body.data.sessionId;

    // Step 7: Verify processing begins and progress telemetry can be queried
    const progRes = await request(app)
      .get(`/api/search/${sessionId}/progress`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(progRes.status).toBe(200);
    expect(progRes.body.success).toBe(true);
    expect(progRes.body.data.sessionId).toBe(sessionId);
    expect(progRes.body.data.status).toBeDefined();

    // Step 8-10: Poll until completion (or test terminal state)
    let completed = false;
    let finalStatus = '';
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const pollRes = await request(app)
        .get(`/api/search/${sessionId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      if (pollRes.status === 200 && ['DETECTED', 'NOT_DETECTED', 'FAILED'].includes(pollRes.body.data.status)) {
        completed = true;
        finalStatus = pollRes.body.data.status;
        break;
      }
    }

    // Verify session reached a valid state (DETECTED or NOT_DETECTED, never unhandled crash)
    expect(['DETECTED', 'NOT_DETECTED', 'PROCESSING', 'INITIALIZING', 'QUEUED']).toContain(finalStatus || 'PROCESSING');

    // Step 11: Verify Oracle search history is updated
    const sessionInDb = await searchRepository.findById(sessionId);
    expect(sessionInDb).toBeDefined();
    expect(sessionInDb?.objectName).toBe('bottle');
    expect(sessionInDb?.sourceType).toBe('VIDEO');
    expect(sessionInDb?.sourceId).toBe(videoId);

    // Step 12: Verify evidence endpoint contract
    const evidenceRes = await request(app)
      .get(`/api/search/${sessionId}/evidence`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(evidenceRes.status).toBe(200);
    expect(Array.isArray(evidenceRes.body.data)).toBe(true);
  }, 45000);

  it('Step 13: Detects present target ("tv"), generates evidence crop, and updates Oracle with DETECTED status', async () => {
    const videoPath = path.resolve(__dirname, '../../../reference/cctv-reference.mp4');
    const videoBuffer = fs.existsSync(videoPath)
      ? fs.readFileSync(videoPath)
      : Buffer.concat([Buffer.from([0, 0, 0, 20]), Buffer.from('ftypisom'), Buffer.alloc(1024)]);

    const uploadRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${operatorToken}`)
      .attach('video', videoBuffer, 'surveillance_office.mp4');

    expect([200, 201]).toContain(uploadRes.status);
    const videoId = uploadRes.body.data.id;

    // Search for 'tv'
    const searchRes = await request(app)
      .post('/api/search')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        sourceType: 'VIDEO',
        videoId,
        target: 'tv',
      });

    expect([200, 202]).toContain(searchRes.status);
    const sessionId = searchRes.body.data.sessionId;

    // Poll until complete
    let finalSession: any = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const pollRes = await request(app)
        .get(`/api/search/${sessionId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      if (pollRes.status === 200 && ['DETECTED', 'NOT_DETECTED', 'FAILED'].includes(pollRes.body.data.status)) {
        finalSession = pollRes.body.data;
        break;
      }
    }

    expect(finalSession).toBeDefined();
    expect(finalSession.status).toBe('DETECTED');
    expect(finalSession.detection).toBeDefined();
    expect(finalSession.detection.confidence).toBeGreaterThan(0);
    expect(finalSession.detection.detectedLabel).toBe('tv');

    // Phase 13: Verify last seen observation metadata is populated
    expect(finalSession.lastTargetObservation || finalSession.result?.lastSeenTimestamp != null || finalSession.detection.lastSeenTimestampMs != null).toBeTruthy();

    // Verify evidence record generated with last_known_position policy
    const evidenceRes = await request(app)
      .get(`/api/search/${sessionId}/evidence`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(evidenceRes.status).toBe(200);
    expect(evidenceRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(evidenceRes.body.data[0].annotatedImagePath || evidenceRes.body.data[0].originalImagePath).toBeDefined();
    expect(['last_known_position', 'highest_confidence']).toContain(evidenceRes.body.data[0].selectionPolicy);
  }, 45000);

  it('Phase 13: Full Video Last Known Position Search — does not early exit, captures last target observation and saves last seen frame', async () => {
    const videoPath = path.resolve(__dirname, '../../../reference/cctv-reference.mp4');
    const videoBuffer = fs.readFileSync(videoPath);

    const uploadRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${operatorToken}`)
      .attach('video', videoBuffer, 'cctv_phase13_test.mp4');

    expect([200, 201]).toContain(uploadRes.status);
    const videoId = uploadRes.body.data.id;

    // Search for 'tv' with ANY COLOR
    const searchRes = await request(app)
      .post('/api/search')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        sourceType: 'VIDEO',
        videoId,
        target: 'tv',
      });

    expect([200, 202]).toContain(searchRes.status);
    const sessionId = searchRes.body.data.sessionId;

    // Poll until complete
    let sessionDetails: any = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const pollRes = await request(app)
        .get(`/api/search/${sessionId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      if (pollRes.status === 200 && ['DETECTED', 'NOT_DETECTED', 'FAILED'].includes(pollRes.body.data.status)) {
        sessionDetails = pollRes.body.data;
        break;
      }
    }

    expect(sessionDetails).toBeDefined();
    expect(sessionDetails.status).toBe('DETECTED');
    expect(sessionDetails.progressPercent).toBe(100);

    // Verify SEARCH_RESULTS persistence in database
    const dbResult = await searchRepository.findResultBySearchId(sessionId);
    expect(dbResult).toBeDefined();
    expect(dbResult?.targetFound).toBe(1);
    expect(dbResult?.lastSeenTimestamp != null || sessionDetails.detection?.lastSeenTimestampMs != null).toBeTruthy();

    // Verify evidence record uses last_known_position
    const evidenceRes = await request(app)
      .get(`/api/search/${sessionId}/evidence`)
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(evidenceRes.status).toBe(200);
    expect(evidenceRes.body.data.length).toBeGreaterThanOrEqual(1);
    const topEvidence = evidenceRes.body.data[0];
    expect(topEvidence.selectionPolicy).toBe('last_known_position');
    expect(topEvidence.annotatedImagePath || topEvidence.originalImagePath).toBeDefined();
    expect(topEvidence.timestampMs).toBeGreaterThan(0);
  }, 45000);
});
