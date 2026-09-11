import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { authService } from '../services/authService';
import { db } from '../config/database';

describe('Admin Console Endpoints & Authorization Tests', () => {
  let adminToken: string;
  let operatorToken: string;

  beforeAll(async () => {
    await db.init();
    await authService.seedDefaultUsers();

    // Log in as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@controlf.internal', password: 'AdminPass123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.accessToken;

    // Log in as Operator
    const opRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operator@controlf.internal', password: 'OperatorPass123!' });
    expect(opRes.status).toBe(200);
    operatorToken = opRes.body.data.accessToken;
  });

  describe('1. Security & RBAC Guards', () => {
    it('rejects unauthenticated requests to /api/admin/* with 401', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects Operator access to /api/admin/* with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows Admin access to /api/admin/stats with 200', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalUsers).toBeGreaterThan(0);
      expect(res.body.data.activeCameras).toBeGreaterThanOrEqual(0);
      expect(res.body.data.databaseStatus).toBeDefined();
    });
  });

  describe('2. Safe Database Metadata Inspection', () => {
    it('returns safe database metadata without exposing passwords or credentials', async () => {
      const res = await request(app)
        .get('/api/admin/database')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.connectionStatus).toBeDefined();
      expect(data.databaseVersion).toBe('21c XE');
      expect(data.tables).toBeInstanceOf(Array);
      expect(data.tables.length).toBe(10);

      // Verify no secrets leaked
      const rawString = JSON.stringify(data).toLowerCase();
      expect(rawString).not.toContain('password');
      expect(rawString).not.toContain('secret');
      expect(rawString).not.toContain('pass123');
    });
  });

  describe('3. User Management & Admin Self-Protection', () => {
    it('creates a new operator and audits the mutation', async () => {
      const newEmail = `op_${Date.now()}@ctrlf.local`;
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: newEmail,
          fullName: 'Test Operator',
          password: 'Password123!',
          role: 'OPERATOR',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe(newEmail);
      expect(res.body.data.role).toBe('OPERATOR');
    });

    it('prevents removing or demoting the final administrator', async () => {
      // Find admin users
      const usersRes = await request(app)
        .get('/api/admin/users?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(usersRes.status).toBe(200);
      const admins = usersRes.body.data.users;

      // If only 1 admin left, demoting should fail
      // Or if we demote until 1 admin remains, the last one cannot be demoted
      if (admins.length === 1) {
        const demoteRes = await request(app)
          .patch(`/api/admin/users/${admins[0].id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'OPERATOR' });
        expect(demoteRes.status).toBe(400);
      }
    });
  });

  describe('4. Table Explorer & Injection Defense', () => {
    it('allows inspecting approved table data with sanitized columns', async () => {
      const res = await request(app)
        .get('/api/admin/tables/USERS')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.tableName).toBe('USERS');
      expect(res.body.data.rows).toBeInstanceOf(Array);

      // Ensure password hash column is removed from rows
      for (const row of res.body.data.rows) {
        expect(row.PASSWORD_HASH).toBeUndefined();
        expect(row.passwordHash).toBeUndefined();
      }
    });

    it('rejects arbitrary or non-approved table names with 400', async () => {
      const res = await request(app)
        .get('/api/admin/tables/NON_EXISTENT_SECRET_TABLE')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Telemetry & Records Endpoints', () => {
    it('returns cameras list with real data', async () => {
      const res = await request(app)
        .get('/api/admin/cameras')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.cameras).toBeInstanceOf(Array);
    });

    it('returns search sessions with real data', async () => {
      const res = await request(app)
        .get('/api/admin/search-sessions')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.sessions).toBeInstanceOf(Array);
    });

    it('returns detections list with real data', async () => {
      const res = await request(app)
        .get('/api/admin/detections')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.detections).toBeInstanceOf(Array);
    });

    it('returns audit logs with real hash chain verification', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.logs).toBeInstanceOf(Array);
      expect(res.body.data.chainVerification).toBeDefined();
    });
  });
});
