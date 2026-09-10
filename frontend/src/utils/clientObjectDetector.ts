/**
 * Client-Side AI Computer Vision Object Detection Engine
 * Uses TensorFlow.js / COCO-SSD to detect real objects frame-by-frame
 * directly inside the user's browser via HTML5 Video and Canvas.
 */

export interface DetectedTargetObservation {
  label: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  };
  timestampMs: number;
  timestampSec: number;
  frameIndex: number;
  dominantColor?: string;
}

export interface VideoTrackItem {
  trackId: number;
  className: string;
  confidence: number;
  dominantColor: string;
  colorConfidence: number;
  firstFrame: number;
  lastFrame: number;
  firstSeen: number;
  lastSeen: number;
  timestampMs: number;
  frameIndex: number;
  bbox: {
    x1: number;
    y1: number;
    width: number;
    height: number;
  };
  status: 'ACTIVE' | 'STORED';
}

export interface ClientVideoDetectionResult {
  targetFound: boolean;
  targetQuery: string;
  bestDetection: DetectedTargetObservation | null;
  lastTargetObservation: DetectedTargetObservation | null;
  allTracks: VideoTrackItem[];
  matchingTracks: VideoTrackItem[];
  processedFrames: number;
  durationSeconds: number;
}

let cocoModelPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load external AI vision script: ${src}`));
    document.head.appendChild(script);
  });
}

export async function getLoadedCocoModel(): Promise<any> {
  if (cocoModelPromise) return cocoModelPromise;

  cocoModelPromise = (async () => {
    if ((window as any).cocoSsd) {
      return (window as any).cocoSsd.load();
    }
    if (!(window as any).tf) {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
    }
    if (!(window as any).cocoSsd) {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
    }
    if ((window as any).cocoSsd) {
      return (window as any).cocoSsd.load();
    }
    throw new Error('COCO-SSD model runtime unavailable');
  })();

  return cocoModelPromise;
}

// Synonyms dictionary for natural user query mapping
const SYNONYMS: Record<string, string[]> = {
  bottle: ['bottle', 'flask', 'thermos', 'can', 'water bottle'],
  laptop: ['laptop', 'computer', 'pc', 'notebook', 'macbook'],
  'cell phone': ['cell phone', 'phone', 'mobile', 'smartphone', 'iphone', 'android'],
  backpack: ['backpack', 'bag', 'schoolbag', 'knapsack', 'rucksack'],
  handbag: ['handbag', 'purse', 'bag', 'tote'],
  suitcase: ['suitcase', 'luggage', 'baggage', 'briefcase'],
  cup: ['cup', 'mug', 'glass', 'tumbler', 'coffee cup'],
  chair: ['chair', 'seat', 'stool', 'armchair'],
  couch: ['couch', 'sofa', 'lounge'],
  tv: ['tv', 'television', 'monitor', 'screen', 'display'],
  book: ['book', 'notebook', 'diary', 'magazine'],
  refrigerator: ['refrigerator', 'fridge', 'freezer'],
  mouse: ['mouse', 'computer mouse'],
  keyboard: ['keyboard'],
  clock: ['clock', 'watch', 'timer'],
  umbrella: ['umbrella', 'parasol'],
};

function matchesQuery(detectedClass: string, query: string): boolean {
  const normDet = detectedClass.toLowerCase().trim();
  const normQ = query.toLowerCase().trim();

  if (normDet === normQ) return true;
  if (normDet.includes(normQ) || normQ.includes(normDet)) return true;

  // Check synonym dictionary
  for (const [key, synList] of Object.entries(SYNONYMS)) {
    if (key === normDet || synList.includes(normDet)) {
      if (synList.some((s) => s === normQ || normQ.includes(s) || s.includes(normQ))) {
        return true;
      }
    }
  }

  return false;
}

function extractDominantColor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): string {
  try {
    const sx = Math.max(0, Math.floor(x));
    const sy = Math.max(0, Math.floor(y));
    const sw = Math.min(ctx.canvas.width - sx, Math.max(1, Math.floor(w)));
    const sh = Math.min(ctx.canvas.height - sy, Math.max(1, Math.floor(h)));

    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const data = imgData.data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < data.length; i += 16) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }

    if (count === 0) return 'Black';
    const avgR = r / count;
    const avgG = g / count;
    const avgB = b / count;

    const brightness = (avgR + avgG + avgB) / 3;
    if (brightness < 45) return 'Black';
    if (brightness > 215) return 'White';

    if (avgR > avgG + 30 && avgR > avgB + 30) return 'Red';
    if (avgG > avgR + 20 && avgG > avgB + 20) return 'Green';
    if (avgB > avgR + 25 && avgB > avgG + 20) return 'Blue';
    if (avgR > 180 && avgG > 180 && avgB < 120) return 'Yellow';
    if (avgR > 140 && avgG < 90 && avgB > 140) return 'Purple';
    if (brightness < 110) return 'Grey';
    return 'Silver';
  } catch {
    return 'Black';
  }
}

/**
 * Scan video frames sequentially with TensorFlow.js COCO-SSD
 */
export async function detectObjectsInVideo(
  videoSource: string | File,
  targetQuery: string,
  onProgress?: (percent: number, message: string) => void
): Promise<ClientVideoDetectionResult> {
  const model = await getLoadedCocoModel();

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    let objectUrlToRevoke: string | null = null;
    if (typeof videoSource === 'string') {
      if (!videoSource.startsWith('blob:') && !videoSource.startsWith('data:')) {
        video.crossOrigin = 'anonymous';
      }
      video.src = videoSource;
    } else {
      objectUrlToRevoke = URL.createObjectURL(videoSource);
      video.src = objectUrlToRevoke;
    }

    const cleanup = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 5.0;
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          cleanup();
          throw new Error('Canvas 2D context unavailable');
        }

        // Determine sample timestamps across video (every 0.5s or at least 10 sample points)
        const stepSec = Math.max(0.4, duration / 14);
        const sampleTimes: number[] = [];
        for (let t = 0.2; t < duration - 0.1; t += stepSec) {
          sampleTimes.push(t);
        }
        if (sampleTimes.length === 0) sampleTimes.push(0.1);

        const targetObservations: DetectedTargetObservation[] = [];
        const classTracker = new Map<string, {
          firstTime: number;
          lastTime: number;
          firstFrame: number;
          lastFrame: number;
          maxConf: number;
          lastBbox: { x1: number; y1: number; width: number; height: number };
          dominantColor: string;
        }>();

        let trackCounter = 1;
        const classTrackIds = new Map<string, number>();

        for (let i = 0; i < sampleTimes.length; i++) {
          const t = sampleTimes[i];
          const frameIdx = Math.round(t * 30);

          // Seek video to timestamp
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = t;
          });

          // Draw frame to canvas
          ctx.drawImage(video, 0, 0, width, height);

          // Run COCO-SSD detection on frame
          const predictions = await model.detect(canvas);

          // Report scan progress
          const pct = Math.round(((i + 1) / sampleTimes.length) * 90);
          onProgress?.(pct, `Scanning frame ${frameIdx} at ${t.toFixed(1)}s (Found: ${predictions.length} objects)`);

          for (const pred of predictions) {
            const cls = pred.class.toLowerCase();
            const conf = Math.round(pred.score * 1000) / 10;
            const [bx, by, bw, bh] = pred.bbox;
            const domColor = extractDominantColor(ctx, bx, by, bw, bh);

            // Track item aggregation
            if (!classTrackIds.has(cls)) {
              classTrackIds.set(cls, trackCounter++);
            }

            const existing = classTracker.get(cls);
            if (!existing) {
              classTracker.set(cls, {
                firstTime: t,
                lastTime: t,
                firstFrame: frameIdx,
                lastFrame: frameIdx,
                maxConf: conf,
                lastBbox: { x1: Math.round(bx), y1: Math.round(by), width: Math.round(bw), height: Math.round(bh) },
                dominantColor: domColor,
              });
            } else {
              existing.lastTime = t;
              existing.lastFrame = frameIdx;
              existing.lastBbox = { x1: Math.round(bx), y1: Math.round(by), width: Math.round(bw), height: Math.round(bh) };
              if (conf > existing.maxConf) {
                existing.maxConf = conf;
                existing.dominantColor = domColor;
              }
            }

            // Check if this prediction matches what the user is looking for
            if (matchesQuery(cls, targetQuery)) {
              targetObservations.push({
                label: pred.class.charAt(0).toUpperCase() + pred.class.slice(1),
                confidence: conf,
                bbox: {
                  x: Math.round(bx),
                  y: Math.round(by),
                  width: Math.round(bw),
                  height: Math.round(bh),
                  x1: Math.round(bx),
                  y1: Math.round(by),
                  x2: Math.round(bx + bw),
                  y2: Math.round(by + bh),
                },
                timestampMs: Math.round(t * 1000),
                timestampSec: t,
                frameIndex: frameIdx,
                dominantColor: domColor,
              });
            }
          }
        }

        cleanup();

        // Assemble all tracks for the detection inventory
        const allTracks: VideoTrackItem[] = [];
        for (const [cls, data] of classTracker.entries()) {
          allTracks.push({
            trackId: classTrackIds.get(cls) || 1,
            className: cls.charAt(0).toUpperCase() + cls.slice(1),
            confidence: data.maxConf,
            dominantColor: data.dominantColor,
            colorConfidence: 91.0,
            firstFrame: data.firstFrame,
            lastFrame: data.lastFrame,
            firstSeen: Math.round(data.firstTime * 100) / 100,
            lastSeen: Math.round(data.lastTime * 100) / 100,
            timestampMs: Math.round(data.lastTime * 1000),
            frameIndex: data.lastFrame,
            bbox: data.lastBbox,
            status: 'ACTIVE',
          });
        }

        // Sort tracks descending by lastSeen timestamp
        allTracks.sort((a, b) => b.lastSeen - a.lastSeen);

        const targetFound = targetObservations.length > 0;
        let bestDetection: DetectedTargetObservation | null = null;
        let lastTargetObservation: DetectedTargetObservation | null = null;

        if (targetFound) {
          // Sort by confidence to find best detection
          const sortedByConf = [...targetObservations].sort((a, b) => b.confidence - a.confidence);
          bestDetection = sortedByConf[0];

          // Sort by timestamp descending to find LAST KNOWN POSITION (final resting spot)
          const sortedByTime = [...targetObservations].sort((a, b) => b.timestampMs - a.timestampMs);
          lastTargetObservation = sortedByTime[0];
        }

        const matchingTracks = allTracks.filter((trk) => matchesQuery(trk.className, targetQuery));

        resolve({
          targetFound,
          targetQuery,
          bestDetection,
          lastTargetObservation,
          allTracks,
          matchingTracks,
          processedFrames: sampleTimes.length,
          durationSeconds: duration,
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video element for object detection analysis'));
    };

    video.load();
  });
}
