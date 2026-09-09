/**
 * Authoritative Detection Provider Interface & Implementations
 * 
 * Provides a standardized detection result interface for Phase 2 and Phase 3.
 * The Three.js layer consumes this generic result rather than embedding hardcoded target positions.
 */

export interface GenericDetectionResult {
  targetClass: string;
  confidence: number | null;
  bbox: [number, number, number, number] | null; // [x, y, w, h] normalized
  frameNumber?: number | null;
  timestamp: string;
  trackId: string | null;
  position: [number, number, number] | null;     // 3D room coordinates if mapped [x, y, z]
  cameraId: string;
}

export interface IDetectionProvider {
  name: string;
  isRealAI: boolean;
  evaluateSearch(query: string, cameraPanRad?: number, cameraTiltRad?: number): Promise<GenericDetectionResult | null>;
}

/**
 * DemoDetectionProvider:
 * Isolates the deterministic 3D demo target (keys on desk) behind an explicit adapter.
 * Used exclusively for local visual demonstration until real CV model inference is connected in Phase 3.
 * Never claims to be AI detection; confidence and trackId remain null.
 */
export class DemoDetectionProvider implements IDetectionProvider {
  public readonly name = 'DemoDetectionProvider';
  public readonly isRealAI = false;

  // Physical coordinates of the demo target in room coordinates (Keys on desk)
  private readonly demoTargetPosition: [number, number, number] = [-1.45, -0.38, 1.65];

  public async evaluateSearch(query: string): Promise<GenericDetectionResult | null> {
    const q = (query || '').toLowerCase().trim();
    const isPresent = q.includes('key') || q.includes('car');

    if (!isPresent) {
      return null;
    }

    return {
      targetClass: 'keys',
      confidence: null, // Null in demo: never fake AI confidence
      bbox: null,       // Null in demo: no fake 2D bounding boxes
      frameNumber: null,
      timestamp: new Date().toISOString(),
      trackId: null,   // Null in demo: no fake tracking IDs
      position: this.demoTargetPosition,
      cameraId: 'CAM-01',
    };
  }
}

/**
 * Active provider instance (can be swapped with RealDetectionProvider in Phase 3)
 */
export const activeDetectionProvider: IDetectionProvider = new DemoDetectionProvider();
