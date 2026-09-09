import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/config/database';

describe('Video API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    await db.init();
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `video_tester_${Date.now()}@controlf.internal`,
        password: 'Password123!',
        fullName: 'Video Analyst',
      });
    authToken = regRes.body.data.accessToken;
  });

  let uploadedVideoId: string;

  it('POST /api/videos/upload should upload a valid MP4 video and save Oracle metadata', async () => {
    const fakeVideoBuffer = Buffer.from('FAKE_MP4_BINARY_DATA_FOR_SURVEILLANCE_TESTING');

    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('video', fakeVideoBuffer, {
        filename: 'cctv_hallway_footage.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.originalFilename).toBe('cctv_hallway_footage.mp4');
    expect(res.body.data.status).toBe('READY');

    uploadedVideoId = res.body.data.id;
  });

  it('POST /api/videos/upload should reject unsupported MIME types like text files', async () => {
    const textBuffer = Buffer.from('Plain text file');

    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('video', textBuffer, {
        filename: 'malicious.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(415);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('GET /api/videos should retrieve video footage list', async () => {
    const res = await request(app)
      .get('/api/videos')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/videos/:videoId should retrieve specific video metadata', async () => {
    const res = await request(app)
      .get(`/api/videos/${uploadedVideoId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(uploadedVideoId);
  });
});
