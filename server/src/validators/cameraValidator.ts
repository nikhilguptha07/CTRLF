import { z } from 'zod';

export const createCameraSchema = z.object({
  name: z.string().min(2, 'Camera name must be at least 2 characters').max(100),
  location: z.string().min(2, 'Location is required').max(150),
  protocol: z
    .enum(['RTSP', 'ONVIF', 'ONVIF_PTZ', 'USB_WEBCAM', 'LOCAL_NETWORK', 'WEBRTC', 'HLS', 'CUSTOM'])
    .optional(),
  streamUrl: z.string().max(1000).optional(),
  rtspUrl: z.string().max(1000).optional(),
  uri: z.string().max(1000).optional(),
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  deviceIndex: z.number().int().min(0).max(32).optional(),
  username: z.string().max(100).optional(),
  password: z.string().max(100).optional(),
  ptzEnabled: z.boolean().optional(),
});

export const updateCameraSchema = createCameraSchema.partial().extend({
  status: z.enum(['ONLINE', 'OFFLINE', 'ACTIVE_SEARCH', 'ERROR']).optional(),
});

export const ptzCommandSchema = z.object({
  action: z.enum(['START', 'STOP', 'GOTO_PRESET', 'SET_PRESET', 'HOME']),
  panSpeed: z.number().min(-1.0).max(1.0).optional(),
  tiltSpeed: z.number().min(-1.0).max(1.0).optional(),
  zoomSpeed: z.number().min(-1.0).max(1.0).optional(),
  presetId: z.string().optional(),
  presetName: z.string().optional(),
  durationMs: z.number().int().positive().optional(),
});

export type CreateCameraInput = z.infer<typeof createCameraSchema>;
export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;
export type PTZCommandInput = z.infer<typeof ptzCommandSchema>;
