import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { db } from '../config/database';
import { cameraOrchestratorService } from '../services/cameraOrchestratorService';
import { searchService } from '../services/searchService';
import { searchRepository } from '../repositories/searchRepository';
import { detectionService } from '../services/detectionService';

describe('CONTROL F — Camera Orchestrator & Multi-Camera Search Integration', () => {
  beforeAll(async () => {
    await db.init();
  });

  afterAll(async () => {
    await db.close();
  });

  it('1. POST /api/search with sourceType: ORCHESTRATOR initializes multi-camera search', async () => {
    const res = await request(app)
      .post('/api/search')
      .send({
        target: 'keys',
        sourceType: 'ORCHESTRATOR',
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.target).toBe('keys');
    expect(res.body.data.orchestrator).toBe(true);
    expect(res.body.data.cameraCount).toBeGreaterThanOrEqual(2);

    const sessionId = res.body.data.sessionId;

    // Verify session was created in DB
    const session = await searchRepository.findById(sessionId);
    expect(session).not.toBeNull();
    expect(session?.sourceType).toBe('ORCHESTRATOR');
    expect(session?.objectName).toBe('keys');
  });

  it('2. GET /api/searches/:searchId/orchestrator returns status of all orchestrated cameras', async () => {
    const initRes = await cameraOrchestratorService.initiateOrchestratedSearch('test-user-orch', {
      objectName: 'keys',
      sourceType: 'ORCHESTRATOR',
      sourceId: 'CAM_01',
    });

    const status = await cameraOrchestratorService.getOrchestratorStatus(initRes.sessionId);
    expect(status).not.toBeNull();
    expect(status?.sessionId).toBe(initRes.sessionId);
    expect(status?.target).toBe('keys');
    expect(status?.cameras).toBeDefined();
    expect(Object.keys(status!.cameras).length).toBeGreaterThanOrEqual(2);

    // REST endpoint check
    const res = await request(app).get(`/api/searches/${initRes.sessionId}/orchestrator`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cameras).toBeDefined();
  });

  it('3. Preemptive Early Cancellation ("Stop/Cancel Others") stops sibling cameras when target is found', async () => {
    const initRes = await cameraOrchestratorService.initiateOrchestratedSearch('test-user-orch-win', {
      objectName: 'keys',
      sourceType: 'ORCHESTRATOR',
      sourceId: 'CAM_01',
    });

    const searchId = initRes.sessionId;

    // Simulate winning on CAM_01
    await cameraOrchestratorService.stopOtherCameras(searchId, 'CAM_01');

    const status = await cameraOrchestratorService.getOrchestratorStatus(searchId);
    expect(status).not.toBeNull();

    // Check sibling cameras were preempted
    for (const [camId, camStatus] of Object.entries(status!.cameras)) {
      if (camId !== 'CAM_01') {
        expect(camStatus.status).toBe('CANCELLED_PREEMPTED');
        expect(camStatus.cancelReason).toContain('Preempted by Orchestrator');
      }
    }
  });

  it('4. Orchestrator manual cancellation cleanly cancels all active camera workers', async () => {
    const initRes = await cameraOrchestratorService.initiateOrchestratedSearch('test-user-cancel', {
      objectName: 'backpack',
      sourceType: 'ORCHESTRATOR',
      sourceId: 'CAM_01',
    });

    const cancelRes = await cameraOrchestratorService.cancelOrchestratorSearch(initRes.sessionId, 'test-user-cancel');
    expect(cancelRes.success).toBe(true);

    const session = await searchRepository.findById(initRes.sessionId);
    expect(session?.status).toBe('CANCELLED');
  });

  it('5. Negative query "unicorn" across camera orchestrator correctly evaluates to NOT_DETECTED', async () => {
    const initRes = await cameraOrchestratorService.initiateOrchestratedSearch('test-user-negative', {
      objectName: 'unicorn',
      sourceType: 'ORCHESTRATOR',
      sourceId: 'CAM_01',
    });

    // Wait for the orchestrated scan to settle
    let session = await searchRepository.findById(initRes.sessionId);
    for (let i = 0; i < 25 && session && !['NOT_DETECTED', 'FAILED', 'DETECTED', 'CANCELLED'].includes(session.status); i++) {
      await new Promise((r) => setTimeout(r, 200));
      session = await searchRepository.findById(initRes.sessionId);
    }

    expect(session?.status).toBe('NOT_DETECTED');

    const detection = await detectionService.getResultBySearchId(initRes.sessionId);
    expect(detection?.found).toBe(false);
  }, 10000);
});
