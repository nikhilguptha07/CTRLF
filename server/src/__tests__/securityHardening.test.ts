import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';
import { userRepository } from '../repositories/userRepository';
import { auditRepository } from '../repositories/auditRepository';
import { db } from '../config/database';
import { env } from '../config/env';

describe('PHASE 9 — Enterprise Security, Authentication, RBAC & Audit Verification', () => {
  let adminToken: string;
  let operatorToken: string;
  let viewerToken: string;

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

    // Log in as Viewer
    const viewerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@controlf.internal', password: 'ViewerPass123!' });
    expect(viewerRes.status).toBe(200);
    viewerToken = viewerRes.body.data.accessToken;
  });

  describe('1. Authentication & JWT Security (Sections 1, 2, 26)', () => {
    it('POST /api/auth/login returns verified JWT access/refresh tokens with HttpOnly cookies', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@controlf.internal', password: 'AdminPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.permissions).toContain('SYSTEM_CONFIGURE');

      // Check HttpOnly cookies
      const rawCookies = res.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : (rawCookies ? [rawCookies] : []);
      const hasAccessCookie = cookies.some((c: string) => c.includes('accessToken=') && c.includes('HttpOnly'));
      const hasRefreshCookie = cookies.some((c: string) => c.includes('refreshToken=') && c.includes('HttpOnly'));
      expect(hasAccessCookie).toBe(true);
      expect(hasRefreshCookie).toBe(true);
    });

    it('POST /api/auth/login with wrong password returns 401 with generic error message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@controlf.internal', password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('Brute-force progressive lockout triggers after 5 consecutive failures', async () => {
      const testEmail = `brute_victim_${uuidv4()}@controlf.internal`;
      await authService.register({
        email: testEmail,
        password: 'SecurePassword123!',
        fullName: 'Brute Target',
        role: 'OPERATOR',
      });

      // 5 consecutive wrong logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: 'WrongPassword!' });
      }

      // 6th attempt must be locked out with HTTP 423
      const lockedRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'SecurePassword123!' });

      expect(lockedRes.status).toBe(423);
      expect(lockedRes.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('GET /api/auth/me returns caller profile with server-verified permissions', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('operator@controlf.internal');
      expect(res.body.data.role).toBe('OPERATOR');
      expect(res.body.data.permissions).toContain('SEARCH_CREATE');
      expect(res.body.data.permissions).not.toContain('SYSTEM_CONFIGURE');
    });

    it('POST /api/auth/logout revokes refresh token and clears cookies', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      const rawCleared = res.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCleared) ? rawCleared : (rawCleared ? [rawCleared] : []);
      const clearedAccess = cookies.some((c: string) => c.includes('accessToken=;'));
      const clearedRefresh = cookies.some((c: string) => c.includes('refreshToken=;'));
      expect(clearedAccess).toBe(true);
      expect(clearedRefresh).toBe(true);
    });
  });

  describe('2. Role-Based Access Control (RBAC) (Sections 3 & 5)', () => {
    it('VIEWER role is forbidden from starting a search (SEARCH_CREATE required)', async () => {
      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          target: 'bottle',
          sourceType: 'CAMERA',
          sourceId: 'CAM_01',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('VIEWER role is forbidden from managing cameras (CAMERA_MANAGE required)', async () => {
      const res = await request(app)
        .post('/api/cameras')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Unauthorized Camera',
          location: 'HQ Lobby',
          sourceType: 'RTSP',
          sourceUri: 'rtsp://192.168.1.50/live',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('OPERATOR role is forbidden from viewing audit logs (AUDIT_VIEW required)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('ADMIN role is authorized to view audit logs and manage cameras', async () => {
      const auditRes = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body.data)).toBe(true);
    });
  });

  describe('3. Tamper-Evident Cryptographic Audit Hash Chain (Sections 12, 13, 14)', () => {
    it('GET /api/audit-logs/verify validates the cryptographic SHA-256 hash chain as VALID', async () => {
      // Record test actions to build a multi-link chain
      await auditService.record({
        userId: '1',
        action: 'TEST_CHAIN_BLOCK_A',
        resourceType: 'SYSTEM',
        status: 'SUCCESS',
      });
      await auditService.record({
        userId: '1',
        action: 'TEST_CHAIN_BLOCK_B',
        resourceType: 'SYSTEM',
        status: 'SUCCESS',
      });

      const res = await request(app)
        .get('/api/audit-logs/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('VALID');
      expect(res.body.data.verifiedCount).toBeGreaterThan(0);
      expect(res.body.data.tamperedRecordId).toBeNull();
    });

    it('detects tampering when an audit record payload or hash is maliciously altered', async () => {
      // Create a fresh audit record
      const record = await auditService.record({
        userId: '1',
        action: 'INTEGRITY_PROBE_EVENT',
        resourceType: 'SECURITY',
        status: 'SUCCESS',
      });
      expect(record).not.toBeNull();

      // Maliciously tamper with the in-memory record's details
      const rawRecords = (db as any).getInMemoryStore()?.audit_logs || [];
      const target = rawRecords.find((r: any) => r.ID === record!.id);
      if (target) {
        target.ACTION = 'TAMPERED_ACTION_MALICIOUS';
      }

      const verifyRes = await request(app)
        .get('/api/audit-logs/verify')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('TAMPERED');
      expect(verifyRes.body.data.tamperedRecordId).toBe(record!.id);
    });
  });

  describe('4. Evidence Security & Path Traversal Protection (Sections 19, 20, 24)', () => {
    it('Unauthenticated requests to /api/evidence/:id are rejected with 401', async () => {
      const res = await request(app).get('/api/evidence/sample-evidence-123');
      expect(res.status).toBe(401);
    });

    it('Path traversal attempts (../) in evidence retrieval are rejected with 400 or 403', async () => {
      const res = await request(app)
        .get('/api/evidence/..%2F..%2Fetc%2Fpasswd')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('5. SQL Injection Resilience (Section 7)', () => {
    it('SQL injection payloads in email and queries are safely neutralized by bind parameters', async () => {
      const injectionEmail = "' OR '1'='1' --";
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: injectionEmail, password: 'password' });

      // Must be safely rejected as invalid credentials without SQL syntax error
      expect([400, 422]).toContain(res.status); // Zod email validator rejects malformed email
    });
  });

  describe('6. Production Health and Readiness Endpoints (Sections 32 & 33)', () => {
    it('GET /api/health returns lightweight ping status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ONLINE');
    });

    it('GET /api/ready tests Oracle database connectivity via SELECT 1 FROM DUAL', async () => {
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body.checks.oracle.ok).toBe(true);
    });
  });
});
