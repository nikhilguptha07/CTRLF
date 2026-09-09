import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/config/database';

describe('Search & Detection API Integration Tests', () => {
  let authToken: string;
  let videoId: string;

  beforeAll(async () => {
    await db.init();

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `search_tester_${Date.now()}@controlf.internal`,
        password: 'Password123!',
        fullName: 'Recovery Investigator',
      });
    authToken = regRes.body.data.accessToken;

    const videoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('video', Buffer.from('FAKE_VIDEO_STREAM'), {
        filename: 'lobby_recording.mp4',
        contentType: 'video/mp4',
      });
    videoId = videoRes.body.data.id;
  });

  let searchId: string;

  it('POST /api/searches should queue an AI object search and return 202 QUEUED', async () => {
    const res = await request(app)
      .post('/api/searches')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        objectName: 'keys',
        description: 'small silver house keys',
        sourceType: 'VIDEO',
        sourceId: videoId,
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('searchId');
    expect(res.body.data.status).toBe('QUEUED');

    searchId = res.body.data.searchId;
  });

  it('GET /api/searches/:searchId should return current search session status and progress', async () => {
    const res = await request(app)
      .get(`/api/searches/${searchId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(searchId);
    expect(res.body.data.objectName).toBe('keys');
  });

  it('GET /api/searches/:searchId/events should return stage telemetry timeline', async () => {
    const res = await request(app)
      .get(`/api/searches/${searchId}/events`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/history should return past search sessions for authenticated user', async () => {
    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
