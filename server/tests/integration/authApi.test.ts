import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/config/database';

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    await db.init();
  });

  const email = `api_user_${Date.now()}@controlf.internal`;
  const password = 'SecurePassword123!';

  it('POST /api/auth/register should create user and return tokens in standard response format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        fullName: 'Test Agent',
        role: 'OPERATOR',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(email);
  });

  it('POST /api/auth/login should authenticate user and issue tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('GET /api/auth/me should return current user profile when authenticated', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(email);
  });

  it('GET /api/auth/me should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
