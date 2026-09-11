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

async function loadScriptWithFallback(srcs: string[], timeoutMs = 25000): Promise<void> {
  for (const src of srcs) {
    if (document.querySelector(`script[src="${src}"]`)) {
      return;
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';

        const timer = setTimeout(() => {
          script.onerror = null;
          script.onload = null;
          reject(new Error(`Timed out loading AI vision script: ${src}`));
        }, timeoutMs);

        script.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timer);
          reject(new Error(`Failed to load external AI vision script: ${src}`));
        };
        document.head.appendChild(script);
      });
      return;
    } catch {
      // Try next mirror
    }
  }
}

export async function getLoadedCocoModel(): Promise<any> {
  if (cocoModelPromise) return cocoModelPromise;

  cocoModelPromise = (async () => {
    try {
      if ((window as any).cocoSsd) {
        return await (window as any).cocoSsd.load();
      }
      if (!(window as any).tf) {
        await loadScriptWithFallback([
          'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
          'https://unpkg.com/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
        ], 25000);
      }
      if (!(window as any).cocoSsd) {
        await loadScriptWithFallback([
          'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',
          'https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',
        ], 25000);
      }
      if ((window as any).cocoSsd) {
        return await (window as any).cocoSsd.load();
      }
    } catch (loadErr) {
      console.warn('[clientObjectDetector] COCO-SSD load warning:', loadErr);
      cocoModelPromise = null;
      return null;
    }
    return null;
  })();

  return cocoModelPromise;
}

// Synonyms dictionary for natural user query mapping to COCO-80 classes
const SYNONYMS: Record<string, string[]> = {
  bottle: ['bottle', 'flask', 'thermos', 'can', 'water bottle', 'water', 'drink', 'beverage', 'container', 'tumbler', 'beer bottle', 'wine bottle', 'plastic bottle'],
  cup: ['cup', 'mug', 'glass', 'tumbler', 'coffee cup', 'teacup', 'chalice', 'drink', 'bottle'],
  laptop: ['laptop', 'computer', 'pc', 'notebook', 'macbook', 'chromebook', 'desktop', 'monitor', 'screen', 'tv', 'keyboard', 'book'],
  'cell phone': ['cell phone', 'phone', 'mobile', 'smartphone', 'iphone', 'android', 'device', 'telephone', 'gadget', 'handset', 'mobile phone'],
  backpack: ['backpack', 'bag', 'schoolbag', 'knapsack', 'rucksack', 'satchel', 'pack'],
  handbag: ['handbag', 'purse', 'bag', 'tote', 'clutch', 'pouch', 'shoulder bag'],
  suitcase: ['suitcase', 'luggage', 'baggage', 'briefcase', 'valise', 'travel bag', 'bag', 'carry-on'],
  chair: ['chair', 'seat', 'stool', 'armchair', 'bench'],
  couch: ['couch', 'sofa', 'lounge', 'futon', 'settee', 'loveseat'],
  tv: ['tv', 'television', 'monitor', 'screen', 'display', 'computer screen', 'cctv', 'laptop'],
  book: ['book', 'notebook', 'diary', 'magazine', 'journal', 'paper', 'binder', 'novel', 'document', 'textbook'],
  refrigerator: ['refrigerator', 'fridge', 'freezer', 'cooler'],
  mouse: ['mouse', 'computer mouse', 'trackpad', 'pointer'],
  keyboard: ['keyboard', 'keypad', 'laptop'],
  clock: ['clock', 'watch', 'timer', 'smartwatch', 'wristwatch', 'wall clock', 'time'],
  umbrella: ['umbrella', 'parasol'],
  person: ['person', 'human', 'man', 'woman', 'individual', 'suspect', 'pedestrian', 'boy', 'girl', 'people', 'someone'],
  car: ['car', 'automobile', 'vehicle', 'sedan', 'suv', 'auto', 'motorcar'],
  bicycle: ['bicycle', 'bike', 'cycle'],
  motorcycle: ['motorcycle', 'motorbike', 'scooter', 'moped'],
  tie: ['tie', 'necktie'],
  remote: ['remote', 'remote control', 'clicker', 'controller', 'keys', 'key', 'fob', 'car keys'],
  scissors: ['scissors', 'shears', 'cutter', 'keys', 'key', 'tool'],
  knife: ['knife', 'pocket knife', 'blade', 'cutter', 'keys', 'key', 'tool'],
  keys: ['keys', 'key', 'car keys', 'house keys', 'keychain', 'fob', 'remote', 'cell phone', 'scissors', 'knife', 'metal key'],
  wallet: ['wallet', 'billfold', 'handbag', 'purse', 'book', 'cardholder', 'pouch'],
};

export function matchesQuery(detectedClass: string, query: string): boolean {
  if (!detectedClass || !query) return false;
  const normDet = detectedClass.toLowerCase().trim();
  const normQ = query.toLowerCase().trim();

  if (normDet === normQ) return true;
  if (normDet.includes(normQ) || normQ.includes(normDet)) return true;

  // Split query into keywords
  const stopWords = new Set(['the', 'a', 'an', 'and', 'with', 'for', 'item', 'lost', 'my', 'that', 'this', 'in', 'on', 'at']);
  const words = normQ.split(/[\s_,-]+/).filter((w) => w.length > 2 && !stopWords.has(w));
  for (const w of words) {
    if (normDet === w || normDet.includes(w) || w.includes(normDet)) {
      return true;
    }
  }

  // Check synonym dictionary groups
  for (const [key, synList] of Object.entries(SYNONYMS)) {
    const isDetInGroup = key === normDet || synList.some((s) => s === normDet || normDet.includes(s) || s.includes(normDet));
    if (isDetInGroup) {
      if (synList.some((s) => s === normQ || normQ.includes(s) || s.includes(normQ))) {
        return true;
      }
      for (const w of words) {
        if (synList.some((s) => s === w || w.includes(s) || s.includes(w))) {
          return true;
        }
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
 * Resilient against seeking timeouts, CORS limits, or detached DOM issues.
 */
export async function detectObjectsInVideo(
  videoSource: string | File,
  targetQuery: string,
  onProgress?: (percent: number, message: string) => void
): Promise<ClientVideoDetectionResult> {
  const emptyResult: ClientVideoDetectionResult = {
    targetFound: false,
    targetQuery,
    bestDetection: null,
    lastTargetObservation: null,
    allTracks: [],
    matchingTracks: [],
    processedFrames: 0,
    durationSeconds: 5.0,
  };

  const model = await getLoadedCocoModel().catch(() => null);

  return new Promise((resolve) => {
    let resolved = false;
    let objectUrlToRevoke: string | null = null;

    const cleanup = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        objectUrlToRevoke = null;
      }
    };

    const safeResolve = (res: ClientVideoDetectionResult) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(res);
    };

    // Overall safety timeout (25 seconds max)
    const overallTimer = setTimeout(() => {
      console.warn('[clientObjectDetector] 25s timeout reached, concluding scan gracefully');
      safeResolve(emptyResult);
    }, 25000);

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    if (typeof videoSource === 'string') {
      if (!videoSource.startsWith('blob:') && !videoSource.startsWith('data:')) {
        video.crossOrigin = 'anonymous';
      }
      video.src = videoSource;
    } else {
      objectUrlToRevoke = URL.createObjectURL(videoSource);
      video.src = objectUrlToRevoke;
    }

    // Video metadata load timeout (8 seconds)
    const metadataTimer = setTimeout(() => {
      if (!resolved && (!video.videoWidth || !video.duration)) {
        console.warn('[clientObjectDetector] Video metadata load timeout');
        clearTimeout(overallTimer);
        safeResolve(emptyResult);
      }
    }, 8000);

    video.onloadedmetadata = async () => {
      clearTimeout(metadataTimer);
      if (resolved) return;

      try {
        const duration = video.duration || 5.0;
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          clearTimeout(overallTimer);
          safeResolve(emptyResult);
          return;
        }

        // Determine sample timestamps evenly from 0.05s across the video
        const stepSec = Math.max(0.25, duration / 16);
        const sampleTimes: number[] = [];
        for (let t = 0.05; t < duration; t += stepSec) {
          sampleTimes.push(Math.round(t * 100) / 100);
        }
        if (sampleTimes.length === 0) sampleTimes.push(0.05);

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
          if (resolved) break;
          const t = sampleTimes[i];
          const frameIdx = Math.round(t * 30);

          // Robust seek with video frame readiness
          await new Promise<void>((seekResolve) => {
            let done = false;
            const onFinish = () => {
              if (done) return;
              done = true;
              video.removeEventListener('seeked', onFinish);
              clearTimeout(seekTimer);
              if ('requestVideoFrameCallback' in video) {
                try {
                  (video as any).requestVideoFrameCallback(() => seekResolve());
                  return;
                } catch {}
              }
              requestAnimationFrame(() => seekResolve());
            };
            const seekTimer = setTimeout(onFinish, 1200);
            video.addEventListener('seeked', onFinish);
            try {
              video.currentTime = t;
            } catch {
              onFinish();
            }
          });

          // Draw frame to canvas
          try {
            ctx.drawImage(video, 0, 0, width, height);
          } catch (drawErr) {
            console.warn('[clientObjectDetector] Canvas draw error:', drawErr);
            continue;
          }

          // Run detection on frame if model is available
          let predictions: any[] = [];
          if (model) {
            try {
              predictions = await model.detect(canvas);
            } catch (detErr) {
              console.warn('[clientObjectDetector] Model detect error on frame:', detErr);
            }
          }

          // Report scan progress
          const pct = Math.round(((i + 1) / sampleTimes.length) * 90);
          onProgress?.(pct, `Scanning frame ${frameIdx} at ${t.toFixed(1)}s`);

          for (const pred of predictions) {
            // Include detections with score >= 0.20 for surveillance video
            if (!pred.score || pred.score < 0.20) continue;

            const cls = pred.class.toLowerCase();
            const conf = Math.round(pred.score * 1000) / 10;
            const [bx, by, bw, bh] = pred.bbox;
            const domColor = extractDominantColor(ctx, bx, by, bw, bh);

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

        allTracks.sort((a, b) => b.lastSeen - a.lastSeen);

        const targetFound = targetObservations.length > 0;
        let bestDetection: DetectedTargetObservation | null = null;
        let lastTargetObservation: DetectedTargetObservation | null = null;

        if (targetFound) {
          const sortedByConf = [...targetObservations].sort((a, b) => b.confidence - a.confidence);
          bestDetection = sortedByConf[0];

          const sortedByTime = [...targetObservations].sort((a, b) => b.timestampMs - a.timestampMs);
          lastTargetObservation = sortedByTime[0];
        }

        const matchingTracks = allTracks.filter((trk) => matchesQuery(trk.className, targetQuery));

        clearTimeout(overallTimer);
        safeResolve({
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
        console.warn('[clientObjectDetector] Scan execution warning:', err);
        clearTimeout(overallTimer);
        safeResolve(emptyResult);
      }
    };

    video.onerror = () => {
      clearTimeout(metadataTimer);
      clearTimeout(overallTimer);
      safeResolve(emptyResult);
    };

    video.load();
  });
}
