import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { aiVisionService, MockVisionProvider, PythonFastApiVisionAdapter } from '../../src/services/aiVisionService';

describe('AiVisionService & VisionProvider Abstraction', () => {
  beforeEach(() => {
    aiVisionService.setProvider(new MockVisionProvider());
  });

  afterEach(() => {
    aiVisionService.setProvider(new PythonFastApiVisionAdapter());
  });
  it('should detect physical objects with bounding reticle and confidence', async () => {
    const dummyBuffer = Buffer.from('mock-frame-bytes');
    const candidates = await aiVisionService.scanFrame(dummyBuffer, 'Keys', 1500, 4);

    expect(candidates.length).toBeGreaterThan(0);
    const match = candidates[0];
    expect(match.label).toEqual('Keys');
    expect(match.confidence).toBeGreaterThan(80);
    expect(match.boundingBox).toHaveProperty('x');
    expect(match.boundingBox).toHaveProperty('y');
    expect(match.boundingBox).toHaveProperty('width');
    expect(match.boundingBox).toHaveProperty('height');
  });

  it('should return empty candidate list for non-existent objects like unicorn or ghost', async () => {
    const dummyBuffer = Buffer.from('mock-frame-bytes');
    const candidates = await aiVisionService.scanFrame(dummyBuffer, 'unicorn', 1500, 4);

    expect(candidates).toEqual([]);
  });

  it('should validate multi-frame temporal consistency', () => {
    const mockCandidates = [
      {
        label: 'Keys',
        confidence: 96.5,
        boundingBox: { x: 640, y: 480, width: 180, height: 120 },
        timestampMs: 1500,
        frameIndex: 3,
      },
      {
        label: 'Keys',
        confidence: 97.2,
        boundingBox: { x: 642, y: 481, width: 180, height: 120 },
        timestampMs: 3000,
        frameIndex: 4,
      },
    ];

    const evaluation = aiVisionService.evaluateTemporalConsistency(mockCandidates);
    expect(evaluation.verified).toBe(true);
    expect(evaluation.bestCandidate?.confidence).toEqual(97.2);
    expect(evaluation.averageConfidence).toBeGreaterThan(90);
  });

  it('should support swapping VisionProvider implementation cleanly', () => {
    const initialName = aiVisionService.getProviderName();
    expect(initialName).toBeDefined();

    aiVisionService.setProvider(new MockVisionProvider());
    expect(aiVisionService.getProviderName()).toEqual('MockVisionProvider');
  });
});
