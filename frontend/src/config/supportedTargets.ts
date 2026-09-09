/**
 * CONTROL F — Canonical Supported Target Classes
 * Aligned with Ultralytics YOLOv8 Pretrained MS COCO (80 Classes)
 */

export const SUPPORTED_COCO_CLASSES: readonly string[] = [
  'person',
  'bicycle',
  'car',
  'motorcycle',
  'airplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'toilet',
  'tv',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
] as const;

/**
 * Common semantic aliases mapping to canonical COCO classes
 */
const ALIASES: Record<string, string> = {
  television: 'tv',
  screen: 'tv',
  monitor: 'tv',
  phone: 'cell phone',
  cellphone: 'cell phone',
  smartphone: 'cell phone',
  computer: 'laptop',
  pc: 'laptop',
  notebook: 'laptop',
  bag: 'backpack',
  rucksack: 'backpack',
  seat: 'chair',
  sofa: 'couch',
  bicycle: 'bicycle',
  bike: 'bicycle',
  automobile: 'car',
  vehicle: 'car',
  human: 'person',
  guy: 'person',
  man: 'person',
  woman: 'person',
};

/**
 * Validates if the requested target is supported by the YOLO detection model.
 */
export function isTargetSupported(query: string): boolean {
  if (!query || !query.trim()) return false;
  const q = query.trim().toLowerCase();

  if (SUPPORTED_COCO_CLASSES.includes(q)) return true;
  if (ALIASES[q]) return true;

  // Handle standard English plural 's' (e.g. bottles -> bottle, laptops -> laptop)
  if (q.endsWith('s')) {
    const singular = q.slice(0, -1);
    if (SUPPORTED_COCO_CLASSES.includes(singular) || ALIASES[singular]) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes query to canonical COCO label.
 */
export function normalizeTargetQuery(query: string): string {
  const q = (query || '').trim().toLowerCase();
  if (ALIASES[q]) return ALIASES[q];
  if (q.endsWith('s')) {
    const singular = q.slice(0, -1);
    if (SUPPORTED_COCO_CLASSES.includes(singular)) return singular;
    if (ALIASES[singular]) return ALIASES[singular];
  }
  return q;
}
