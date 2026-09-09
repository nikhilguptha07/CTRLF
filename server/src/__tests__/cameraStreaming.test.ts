import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../config/database';
import { cameraStreamingService } from '../services/cameraStreamingService';
import { cameraStreamStatusRepository } from '../repositories/cameraStreamStatusRepository';
import { searchJobRepository } from '../repositories/searchJobRepository';
import { cameraRepository } from '../repositories/cameraRepository';
import { socketManager } from '../websocket/socketManager';
import { v4 as uuidv4 } from 'uuid';

describe('PHASE 8 — Real Live CCTV / RTSP Streaming Integration Tests', () => {
  beforeAll(async () => {
    await db.init();
    try {
      await cameraRepository.create({
        id: 'CAM_01',
        userId: '1',
        name: 'Main Overhead CCTV Cam 01',
        location: 'Surveillance Zone Alpha',
        sourceType: 'FILE',
        sourceUriEncrypted: 'reference/cctv-reference.mp4',
        rtspUrlEncrypted: 'reference/cctv-reference.mp4',
        enabled: true,
        priority: 0,
        status: 'ONLINE',
      });
    } catch {
      // already exists
    }
  });

  afterAll(async () => {
    await db.close();
  });

  describe('1. SSRF Protection & Stream URI Validation (Section 25)', () => {
    it('allows valid RTSP and HTTP stream URIs', () => {
      expect(cameraStreamingService.validateStreamUri('rtsp://192.168.1.50:554/live/ch1').valid).toBe(true);
      expect(cameraStreamingService.validateStreamUri('rtsps://camera.secure.net/h264').valid).toBe(true);
      expect(cameraStreamingService.validateStreamUri('http://192.168.1.50:8080/mjpeg').valid).toBe(true);
      expect(cameraStreamingService.validateStreamUri('https://streams.example.com/cctv').valid).toBe(true);
      expect(cameraStreamingService.validateStreamUri('reference/cctv-reference.mp4').valid).toBe(true);
    });

    it('rejects empty or malformed stream URIs', () => {
      expect(cameraStreamingService.validateStreamUri('').valid).toBe(false);
      expect(cameraStreamingService.validateStreamUri('not a uri').valid).toBe(false);
    });

    it('blocks dangerous cloud metadata endpoints (169.254.169.254)', () => {
      const result = cameraStreamingService.validateStreamUri('http://169.254.169.254/latest/meta-data');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('metadata');
    });

    it('rejects unsupported protocols (e.g. ftp, gopher, file URL)', () => {
      expect(cameraStreamingService.validateStreamUri('ftp://192.168.1.10/video.mp4').valid).toBe(false);
      expect(cameraStreamingService.validateStreamUri('gopher://192.168.1.10/stream').valid).toBe(false);
    });
  });

  describe('2. Camera Credential Security & URL Masking (Section 24)', () => {
    it('masks plaintext credentials in RTSP URLs for logs and telemetry', () => {
      const raw = 'rtsp://admin:SecretPassword123@192.168.1.20:554/h264';
      const masked = cameraStreamingService.maskStreamUri(raw);
      expect(masked).toBe('rtsp://***:***@192.168.1.20:554/h264');
      expect(masked).not.toContain('SecretPassword123');
      expect(masked).not.toContain('admin');
    });

    it('leaves uncredentialed URLs unchanged', () => {
      const raw = 'rtsp://192.168.1.20:554/h264';
      expect(cameraStreamingService.maskStreamUri(raw)).toBe(raw);
    });
  });

  describe('3. Authoritative Stream Health & Lifecycle (Sections 2 & 26)', () => {
    it('GET /api/cameras/:cameraId/health returns authoritative stream health', async () => {
      const res = await request(app).get('/api/cameras/CAM_01/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.cameraId).toBe('CAM_01');
      expect(res.body.data.status).toBeDefined();
      expect(typeof res.body.data.currentFps).toBe('number');
      expect(typeof res.body.data.framesReceived).toBe('number');
      expect(typeof res.body.data.framesDropped).toBe('number');
    });

    it('POST /api/cameras/:cameraId/stream/stop updates status to STOPPED cleanly', async () => {
      const res = await request(app).post('/api/cameras/CAM_01/stream/stop');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cameraId).toBe('CAM_01');
      expect(res.body.data.stopped).toBe(true);

      const healthRes = await request(app).get('/api/cameras/CAM_01/health');
      expect(healthRes.body.data.status).toBe('STOPPED');
    });
  });

  describe('4. Oracle Database Persistence (Section 23)', () => {
    it('persists and retrieves CAMERA_STREAM_STATUS records', async () => {
      const testCamId = 'TEST_CAM_STREAM_01';
      await cameraStreamStatusRepository.upsert({
        cameraId: testCamId,
        status: 'CONNECTING',
        connectedAt: new Date(),
        lastFrameAt: null,
        lastError: null,
        currentFps: 0.0,
        framesReceived: 0,
        framesDropped: 0,
        reconnectAttempts: 1,
        updatedAt: new Date(),
      });

      const record = await cameraStreamStatusRepository.findByCameraId(testCamId);
      expect(record).not.toBeNull();
      expect(record?.cameraId).toBe(testCamId);
      expect(record?.status).toBe('CONNECTING');
      expect(record?.reconnectAttempts).toBe(1);

      // Update to LIVE
      await cameraStreamStatusRepository.upsert({
        cameraId: testCamId,
        status: 'LIVE',
        connectedAt: new Date(),
        lastFrameAt: new Date(),
        lastError: null,
        currentFps: 29.8,
        framesReceived: 150,
        framesDropped: 2,
        reconnectAttempts: 0,
        updatedAt: new Date(),
      });

      const updated = await cameraStreamStatusRepository.findByCameraId(testCamId);
      expect(updated?.status).toBe('LIVE');
      expect(updated?.currentFps).toBe(29.8);
      expect(updated?.framesReceived).toBe(150);
      expect(updated?.framesDropped).toBe(2);
    });

    it('persists and queries SEARCH_JOBS per-camera status', async () => {
      const sessionId = uuidv4();
      const jobId = uuidv4();

      const created = await searchJobRepository.create({
        id: jobId,
        sessionId,
        cameraId: 'CAM_01',
        jobStatus: 'PROCESSING_LIVE',
        startedAt: new Date(),
        framesProcessed: 0,
      });

      expect(created).toBeDefined();
      expect(created.sessionId).toBe(sessionId);
      expect(created.cameraId).toBe('CAM_01');
      expect(created.jobStatus).toBe('PROCESSING_LIVE');

      // Update frames and status
      await searchJobRepository.updateStatus(sessionId, 'CAM_01', {
        framesProcessed: 85,
        jobStatus: 'TARGET_ACQUIRED',
        endedAt: new Date(),
      });

      const queried = await searchJobRepository.findBySessionAndCamera(sessionId, 'CAM_01');
      expect(queried).not.toBeNull();
      expect(queried?.jobStatus).toBe('TARGET_ACQUIRED');
      expect(queried?.framesProcessed).toBe(85);
      expect(queried?.endedAt).toBeInstanceOf(Date);
    });
  });

  describe('5. Real-Time Stream Events Emission (Section 11)', () => {
    it('emits stream status events cleanly without runtime exceptions', () => {
      expect(() => {
        socketManager.emitCameraStreamStatus({
          cameraId: 'CAM_01',
          status: 'LIVE',
          currentFps: 30.0,
          framesReceived: 300,
          framesDropped: 0,
          reconnectAttempts: 0,
        });
      }).not.toThrow();

      expect(() => {
        socketManager.emitCameraStreamStatus({
          cameraId: 'CAM_02',
          status: 'ERROR',
          currentFps: 0,
          framesReceived: 0,
          framesDropped: 0,
          reconnectAttempts: 3,
          lastError: 'RTSP connection refused',
        });
      }).not.toThrow();
    });
  });

  describe('6. End-to-End Live Search Pipeline Verification (Section 38)', () => {
    it('CASE A — TARGET PRESENT: Finds real target, confirms ByteTrack lock, persists to Oracle', async () => {
      const searchRes = await request(app)
        .post('/api/search')
        .send({
          target: 'tv',
          sourceType: 'CAMERA',
          sourceId: 'CAM_01',
        });

      expect(searchRes.status).toBe(202);
      expect(searchRes.body.success).toBe(true);
      expect(searchRes.body.data.sessionId).toBeDefined();

      const sessionId = searchRes.body.data.sessionId;

      // Poll until completed
      let completed = false;
      let finalStatus = '';
      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise((r) => setTimeout(r, 250));
        const statusRes = await request(app).get(`/api/searches/${sessionId}`);
        if (statusRes.status === 200 && statusRes.body.data) {
          finalStatus = statusRes.body.data.status;
          if (['DETECTED', 'NOT_DETECTED', 'FAILED', 'CANCELLED'].includes(finalStatus)) {
            completed = true;
            break;
          }
        }
      }

      expect(completed).toBe(true);
      expect(finalStatus).toBe('DETECTED');

      // Verify Oracle SEARCH_JOBS was updated
      const jobs = await searchJobRepository.findBySessionId(sessionId);
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].jobStatus).toBe('TARGET_ACQUIRED');
      expect(jobs[0].framesProcessed).toBeGreaterThan(0);
    }, 35000);

    it('CASE B — TARGET ABSENT: Exhaustive search window completes without detection, evaluates to NOT_DETECTED', async () => {
      const searchRes = await request(app)
        .post('/api/search')
        .send({
          target: 'unicorn',
          sourceType: 'CAMERA',
          sourceId: 'CAM_01',
        });

      expect(searchRes.status).toBe(202);
      const sessionId = searchRes.body.data.sessionId;

      // Poll until completed
      let completed = false;
      let finalStatus = '';
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 200));
        const statusRes = await request(app).get(`/api/searches/${sessionId}`);
        if (statusRes.status === 200 && statusRes.body.data) {
          finalStatus = statusRes.body.data.status;
          if (['DETECTED', 'NOT_DETECTED', 'FAILED', 'CANCELLED'].includes(finalStatus)) {
            completed = true;
            break;
          }
        }
      }

      expect(completed).toBe(true);
      expect(finalStatus).toBe('NOT_DETECTED');

      // Verify Oracle SEARCH_JOBS was updated
      const jobs = await searchJobRepository.findBySessionId(sessionId);
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].jobStatus).toBe('NOT_DETECTED');
    }, 15000);

    it('Cancellation cleans up active jobs without treating as NOT_DETECTED', async () => {
      const searchRes = await request(app)
        .post('/api/search')
        .send({
          target: 'bottle',
          sourceType: 'CAMERA',
          sourceId: 'CAM_01',
        });

      const sessionId = searchRes.body.data.sessionId;

      // Cancel immediately
      const cancelRes = await request(app).post(`/api/searches/${sessionId}/cancel`);
      expect(cancelRes.status).toBe(200);

      const statusRes = await request(app).get(`/api/searches/${sessionId}`);
      expect(statusRes.body.data.status).toBe('CANCELLED');
    });
  });
});
