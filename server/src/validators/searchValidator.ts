import { z } from 'zod';
import { parseTarget } from '../utils/targetParser';
import { CanonicalColor } from '../utils/colorVocabulary';

const targetObjectSchema = z.object({
  className: z.string().max(100).optional().nullable(),
  objectName: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  target: z.string().max(100).optional().nullable(),
  targetText: z.string().max(100).optional().nullable(),
});

export const createSearchSchema = z
  .object({
    objectName: z.string().min(1).max(100).optional(),
    target: z.union([z.string().min(1).max(100), targetObjectSchema]).optional(),
    targetText: z.string().min(1).max(100).optional(),
    targetClass: z.string().max(100).optional().nullable(),
    targetColor: z.string().max(50).optional().nullable(),
    description: z.string().max(500).optional(),
    sourceType: z.enum(['VIDEO', 'CAMERA', 'ORCHESTRATOR']).default('CAMERA'),
    sourceId: z
      .union([z.string().min(1), z.number().int().positive()])
      .transform((val) => String(val))
      .optional(),
    videoId: z.string().min(1).optional(),
    cameraIds: z.array(z.string()).optional(),
  })
  .transform((data) => {
    // Parse target class & color deterministically
    let targetInput: any = data.target;
    if (data.targetClass || data.targetColor) {
      targetInput = {
        className: data.targetClass,
        color: data.targetColor,
      };
    } else if (typeof data.target === 'object' && data.target !== null) {
      targetInput = data.target;
    } else {
      targetInput = data.target || data.targetText || data.objectName || 'bottle';
    }

    const parsed = parseTarget(targetInput);

    return {
      objectName: parsed.targetClass || parsed.targetText || 'bottle',
      targetText: parsed.targetText || parsed.normalizedTarget || 'bottle',
      targetClass: parsed.targetClass,
      targetColor: parsed.targetColor as CanonicalColor | null,
      description: data.description,
      sourceType: data.sourceType,
      sourceId: data.sourceId || data.videoId || '1',
      cameraIds: data.cameraIds,
    };
  });

export type CreateSearchInput = z.infer<typeof createSearchSchema>;
export type CreateSearchRawInput = z.input<typeof createSearchSchema>;
