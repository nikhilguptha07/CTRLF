import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import { db } from '../config/database';
import { searchRepository } from '../repositories/searchRepository';
import { detectionRepository } from '../repositories/detectionRepository';

describe('CONTROL F — Phase 4 Object Tracking Persistence Integration', () => {
  const testSearchId = uuidv4();
  const testUserId = uuidv4();

  beforeEach(async () => {
    // Seed user and search session
    await db.execute(
      `INSERT INTO USERS (id, email, password_hash, role) VALUES (:id, :email, 'hash', 'OPERATOR')`,
      { id: testUserId, email: `tracker-${Date.now()}@controlf.ai` }
    ).catch(() => {});

    await db.execute(
      `INSERT INTO SEARCH_SESSIONS (id, user_id, object_name, source_type, source_id, status)
       VALUES (:id, :userId, 'tv', 'VIDEO', 'VID-01', 'SEARCHING')`,
      { id: testSearchId, userId: testUserId }
    ).catch(() => {});
  });

  it('1. Persists ByteTrack multi-frame object tracks in OBJECT_TRACKS', async () => {
    const trackRecord1 = {
      id: uuidv4(),
      searchId: testSearchId,
      trackId: 7,
      className: 'tv',
      confidence: 88.5,
      frameIndex: 101,
      timestampMs: 4200,
      bboxX: 120.5,
      bboxY: 84.0,
      bboxWidth: 230.0,
      bboxHeight: 386.0,
      status: 'ACTIVE',
    };

    const trackRecord2 = {
      id: uuidv4(),
      searchId: testSearchId,
      trackId: 7,
      className: 'tv',
      confidence: 91.2,
      frameIndex: 102,
      timestampMs: 4250,
      bboxX: 122.0,
      bboxY: 85.0,
      bboxWidth: 231.0,
      bboxHeight: 385.0,
      status: 'ACTIVE',
    };

    await searchRepository.createObjectTrack(trackRecord1);
    await searchRepository.createObjectTrack(trackRecord2);

    const tracks = await searchRepository.findTracksBySearchId(testSearchId);
    expect(tracks.length).toBeGreaterThanOrEqual(2);
    const tvTracks = tracks.filter((t: any) => t.TRACK_ID === 7 || t.trackId === 7);
    expect(tvTracks.length).toBe(2);
    expect(tvTracks[0].CLASS_NAME || tvTracks[0].className).toBe('tv');
  });

  it('2. Persists real trackId in DETECTION_RESULTS', async () => {
    const detectionId = uuidv4();
    await detectionRepository.create({
      id: detectionId,
      searchId: testSearchId,
      found: true,
      confidence: 91.2,
      detectedLabel: 'tv',
      frameTimestampMs: 4250,
      evidenceFramePath: 'uploads/evidence/frame_102.jpg',
      boundingBox: { x: 122, y: 85, width: 231, height: 385 },
      trackId: 7,
    });

    const saved = await detectionRepository.findBySearchId(testSearchId);
    expect(saved).not.toBeNull();
    expect(saved?.trackId).toBe(7);
    expect(saved?.confidence).toBe(91.2);
    expect(saved?.detectedLabel).toBe('tv');
  });

  it('3. Persists matchedTrackId in SEARCH_RESULTS', async () => {
    const resultId = uuidv4();
    await searchRepository.createSearchResult({
      id: resultId,
      searchId: testSearchId,
      targetName: 'tv',
      targetFound: 1,
      finalConfidence: 91.2,
      matchedTrackId: 7,
      summaryNotes: 'Target tv acquired with 91.2% confidence (Track #7)',
    });

    const res = await searchRepository.findResultBySearchId(testSearchId);
    expect(res).not.toBeNull();
    expect(res?.MATCHED_TRACK_ID || res?.matchedTrackId).toBe(7);
    expect(res?.TARGET_FOUND || res?.targetFound).toBe(1);
  });

  it('4. Exposes track history via GET /api/search/:searchId/tracks', async () => {
    const res = await request(app)
      .get(`/api/search/${testSearchId}/tracks`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
