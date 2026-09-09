import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { app } from '../app';
import { db } from '../config/database';
import { searchRepository } from '../repositories/searchRepository';
import { detectionRepository } from '../repositories/detectionRepository';
import { authService } from '../services/authService';
import { parseTarget } from '../utils/targetParser';
import { isColorMatch, normalizeColor } from '../utils/colorVocabulary';
import { v4 as uuidv4 } from 'uuid';

describe('Phase 11: Real Object + Color Detection & Search', () => {
  let operatorToken: string;
  let operatorUserId: string;

  beforeAll(async () => {
    await db.init();

    // Create test operator
    const operatorUser = await authService.register({
      email: `color_tester_${uuidv4()}@controlf.internal`,
      password: 'JudgeColorPassword2026!',
      fullName: 'Color Vision Analyst',
      role: 'OPERATOR',
    });
    operatorToken = operatorUser.accessToken;
    operatorUserId = operatorUser.user.id;
  });

  afterAll(async () => {
    await db.close();
  });

  describe('1. Deterministic Target Parser & Normalization', () => {
    it('parses "red bottle" into class "bottle" and color "RED"', () => {
      const parsed = parseTarget('red bottle');
      expect(parsed.targetClass).toBe('bottle');
      expect(parsed.targetColor).toBe('RED');
      expect(parsed.targetText).toBe('red bottle');
    });

    it('parses "bottle" with NO color (targetColor is null, NEVER UNKNOWN)', () => {
      const parsed = parseTarget('bottle');
      expect(parsed.targetClass).toBe('bottle');
      expect(parsed.targetColor).toBeNull();
    });

    it('parses color-only search "red" into null class and color "RED"', () => {
      const parsed = parseTarget('red');
      expect(parsed.targetClass).toBeNull();
      expect(parsed.targetColor).toBe('RED');
    });

    it('parses multi-word alias "dark blue backpack" into class "backpack" and color "BLUE"', () => {
      const parsed = parseTarget('dark blue backpack');
      expect(parsed.targetClass).toBe('backpack');
      expect(parsed.targetColor).toBe('BLUE');
    });

    it('parses structured object input { className: "bottle", color: "RED" }', () => {
      const parsed = parseTarget({ className: 'bottle', color: 'RED' });
      expect(parsed.targetClass).toBe('bottle');
      expect(parsed.targetColor).toBe('RED');
    });

    it('normalizes color aliases (e.g. GREY -> GRAY)', () => {
      expect(normalizeColor('grey')).toBe('GRAY');
      expect(normalizeColor('GREY')).toBe('GRAY');
      expect(normalizeColor('navy')).toBe('BLUE');
      expect(normalizeColor('crimson')).toBe('RED');
      expect(normalizeColor(null)).toBeNull();
    });
  });

  describe('2. Optional Color Matching Rules', () => {
    it('matches ANY detected color when target color is null (OPTIONAL color rule)', () => {
      expect(isColorMatch('RED', null)).toBe(true);
      expect(isColorMatch('BLUE', null)).toBe(true);
      expect(isColorMatch('BLACK', null)).toBe(true);
      expect(isColorMatch('WHITE', null)).toBe(true);
      expect(isColorMatch('UNKNOWN', null)).toBe(true);
    });

    it('matches strictly when target color is specified', () => {
      expect(isColorMatch('RED', 'RED')).toBe(true);
      expect(isColorMatch('RED', 'red')).toBe(true);
      expect(isColorMatch('BLUE', 'RED')).toBe(false);
      expect(isColorMatch('GREEN', 'YELLOW')).toBe(false);
    });

    it('matches secondary color when object has multiple colors', () => {
      expect(isColorMatch('MULTICOLOR', 'RED', ['RED', 'BLUE'])).toBe(true);
      expect(isColorMatch('RED', 'BLUE', ['BLUE'])).toBe(true);
      expect(isColorMatch('RED', 'YELLOW', ['BLUE'])).toBe(false);
    });
  });

  describe('3. Database & Detection Repository Color Persistence', () => {
    it('persists and retrieves dominantColor, colorConfidence, and secondaryColors', async () => {
      const searchId = `search_${uuidv4()}`;
      const detId = uuidv4();

      await detectionRepository.create({
        id: detId,
        searchId,
        found: true,
        confidence: 91.5,
        detectedLabel: 'bottle',
        dominantColor: 'RED',
        colorConfidence: 87.2,
        secondaryColors: ['BLUE'],
        frameTimestampMs: 1200,
        evidenceFramePath: '/uploads/evidence/sample.jpg',
        trackId: 17,
        boundingBox: { x: 100, y: 120, width: 140, height: 300 },
      });

      const retrieved = await detectionRepository.findBySearchId(searchId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.found).toBe(true);
      expect(retrieved?.detectedLabel).toBe('bottle');
      expect(retrieved?.dominantColor).toBe('RED');
      expect(retrieved?.colorConfidence).toBe(87.2);
      expect(retrieved?.secondaryColors).toEqual(['BLUE']);
      expect(retrieved?.trackId).toBe(17);
    });

    it('persists and retrieves search targets in SEARCH_TARGETS table', async () => {
      const searchId = `search_${uuidv4()}`;
      await searchRepository.createSearchTarget({
        id: uuidv4(),
        searchId,
        targetText: 'red bottle',
        targetClass: 'bottle',
        targetColor: 'RED',
        normalizedTarget: 'red bottle',
      });

      const target = await searchRepository.findTargetBySearchId(searchId);
      expect(target).toBeDefined();
      expect(target?.targetText).toBe('red bottle');
      expect(target?.targetClass).toBe('bottle');
      expect(target?.targetColor).toBe('RED');
      expect(target?.normalizedTarget).toBe('red bottle');
    });
  });

  describe('4. Search API (POST /api/search) with Color Payloads', () => {
    it('accepts structured target object { className: "bottle", color: "RED" }', async () => {
      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          sourceType: 'VIDEO',
          videoId: 'sample_video_01',
          target: {
            className: 'bottle',
            color: 'RED',
          },
        });

      expect([200, 201, 202]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();

      const targetInDb = await searchRepository.findTargetBySearchId(res.body.data.sessionId);
      expect(targetInDb).toBeDefined();
      expect(targetInDb?.targetClass).toBe('bottle');
      expect(targetInDb?.targetColor).toBe('RED');
    });

    it('accepts natural language query "black laptop"', async () => {
      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          sourceType: 'VIDEO',
          videoId: 'sample_video_02',
          target: 'black laptop',
        });

      expect([200, 201, 202]).toContain(res.status);
      expect(res.body.success).toBe(true);

      const targetInDb = await searchRepository.findTargetBySearchId(res.body.data.sessionId);
      expect(targetInDb).toBeDefined();
      expect(targetInDb?.targetClass).toBe('laptop');
      expect(targetInDb?.targetColor).toBe('BLACK');
    });

    it('accepts object without color (optional color preserved as null)', async () => {
      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          sourceType: 'VIDEO',
          videoId: 'sample_video_03',
          target: 'bottle',
        });

      expect([200, 201, 202]).toContain(res.status);

      const targetInDb = await searchRepository.findTargetBySearchId(res.body.data.sessionId);
      expect(targetInDb).toBeDefined();
      expect(targetInDb?.targetClass).toBe('bottle');
      expect(targetInDb?.targetColor).toBeNull();
    });
  });

  describe('5. Video Analysis with Real Object + Color Matching', () => {
    it('executes real video search for "green tv" on cctv-reference.mp4 and detects match', async () => {
      const videoPath = path.resolve(__dirname, '../../../reference/cctv-reference.mp4');
      if (!fs.existsSync(videoPath)) {
        console.warn('Skipping video test: reference/cctv-reference.mp4 not found');
        return;
      }

      // Upload reference video
      const uploadRes = await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${operatorToken}`)
        .attach('video', fs.readFileSync(videoPath), 'office_cctv.mp4');

      expect([200, 201]).toContain(uploadRes.status);
      const videoId = uploadRes.body.data.id;

      // Search for 'green tv' (real video monitor in cctv-reference.mp4 has green screen/tint)
      const searchRes = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          sourceType: 'VIDEO',
          videoId,
          target: 'green tv',
        });

      expect([200, 202]).toContain(searchRes.status);
      const sessionId = searchRes.body.data.sessionId;

      // Poll until completion
      let finalSession: any = null;
      for (let i = 0; i < 200; i++) {
        await new Promise((r) => setTimeout(r, 300));
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
      expect(finalSession.detection.detectedLabel).toBe('tv');
      expect(finalSession.detection.dominantColor).toBe('GREEN');
      expect(finalSession.detection.colorConfidence).toBeGreaterThan(0);
    }, 75000);

    it('rejects match when object class matches but color fails ("red tv") with exact explanation', async () => {
      const videoPath = path.resolve(__dirname, '../../../reference/cctv-reference.mp4');
      if (!fs.existsSync(videoPath)) {
        return;
      }

      const uploadRes = await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${operatorToken}`)
        .attach('video', fs.readFileSync(videoPath), 'office_cctv_mismatch.mp4');

      const videoId = uploadRes.body.data.id;

      // Search for 'red tv' (video only contains green screen tv, no red tv)
      const searchRes = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          sourceType: 'VIDEO',
          videoId,
          target: 'red tv',
        });

      const sessionId = searchRes.body.data.sessionId;

      let finalSession: any = null;
      for (let i = 0; i < 200; i++) {
        await new Promise((r) => setTimeout(r, 300));
        const pollRes = await request(app)
          .get(`/api/search/${sessionId}`)
          .set('Authorization', `Bearer ${operatorToken}`);

        if (pollRes.status === 200 && ['DETECTED', 'NOT_DETECTED', 'FAILED'].includes(pollRes.body.data.status)) {
          finalSession = pollRes.body.data;
          break;
        }
      }

      expect(finalSession).toBeDefined();
      expect(finalSession.status).toBe('NOT_DETECTED');
      // Verify explanation notes
      const searchResult = await searchRepository.findResultBySearchId(sessionId);
      expect(searchResult).toBeDefined();
      const notes = searchResult.summaryNotes || searchResult.summary_notes;
      expect(notes).toContain('requested color RED was not confirmed');
    }, 75000);
  });
});
