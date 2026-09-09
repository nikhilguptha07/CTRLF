import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { detectionRepository } from '../repositories/detectionRepository';
import { DetectionResult, DetectionCandidate } from '../types/detection';

export class DetectionService {
  async saveDetectionResult(
    searchId: string,
    candidate: DetectionCandidate | null,
    evidenceFramePath?: string | null
  ): Promise<DetectionResult> {
    const isFound = candidate !== null && candidate.confidence > 0;

    const result = await detectionRepository.create({
      id: uuidv4(),
      searchId,
      found: isFound,
      confidence: candidate ? candidate.confidence : 0.0,
      detectedLabel: candidate ? candidate.label : 'NO_MATCH',
      dominantColor: candidate?.dominantColor || null,
      colorConfidence: candidate?.colorConfidence != null ? candidate.colorConfidence : null,
      secondaryColors: candidate?.secondaryColors || null,
      frameTimestampMs: candidate ? candidate.timestampMs : null,
      evidenceFramePath: evidenceFramePath || null,
      boundingBox: candidate ? candidate.boundingBox : null,
      trackId: candidate && candidate.trackId != null ? Number(candidate.trackId) : null,
    });

    if (isFound && candidate) {
      let imageBuffer: Buffer | null = null;
      if (evidenceFramePath && fs.existsSync(evidenceFramePath)) {
        try {
          imageBuffer = await fs.promises.readFile(evidenceFramePath);
        } catch {
          imageBuffer = null;
        }
      }

      try {
        await detectionRepository.saveDetection({
          searchId,
          objectName: candidate.label,
          confidence: candidate.confidence,
          timestampSeconds: (candidate.lastSeenTimestampMs ?? candidate.timestampMs) / 1000,
          frameNumber: candidate.lastSeenFrame ?? candidate.frameIndex,
          boundingBox: candidate.boundingBox,
          detectionStatus: 'TARGET_ACQUIRED',
          image: imageBuffer || undefined,
        });
      } catch {
        // Non-blocking fallback
      }
    }

    return {
      ...result,
      lastSeenTimestampMs: candidate ? (candidate.lastSeenTimestampMs ?? candidate.timestampMs) : null,
      lastSeenFrame: candidate ? (candidate.lastSeenFrame ?? candidate.frameIndex) : null,
    };
  }

  async getResultBySearchId(searchId: string): Promise<DetectionResult | null> {
    return detectionRepository.findBySearchId(searchId);
  }
}

export const detectionService = new DetectionService();
