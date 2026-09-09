import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/config/database';

describe('Camera API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    await db.init();
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `cam_tester_${Date.now()}@controlf.internal`,
        password: 'Password123!',
        fullName: 'Camera Operator',
        role: 'ADMIN',
      });
    authToken = regRes.body.data.accessToken;
  });

  let createdCameraId: string;

  it('POST /api/cameras should register a CCTV camera and encrypt RTSP credentials', async () => {
    const res = await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'CAM_04_SOUTH_ENTRANCE',
        location: 'Sector 4 Main Corridor',
        rtspUrl: 'rtsp://admin:superSecretCameraPass@192.168.1.120:554/live',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('CAM_04_SOUTH_ENTRANCE');
    expect(res.body.data).not.toHaveProperty('rtspUrl');
    expect(res.body.data).not.toHaveProperty('rtspUrlEncrypted');

    createdCameraId = res.body.data.id;
  });

  it('GET /api/cameras should return list of cameras belonging to user', async () => {
    const res = await request(app)
      .get('/api/cameras')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/cameras/:cameraId/test should verify camera stream handshake', async () => {
    const res = await request(app)
      .post(`/api/cameras/${createdCameraId}/test`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reachable).toBe(true);
  });

  it('DELETE /api/cameras/:cameraId should remove registered camera', async () => {
    const res = await request(app)
      .delete(`/api/cameras/${createdCameraId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
