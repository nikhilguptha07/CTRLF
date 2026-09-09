export const VIDEO_CONFIG = {
  ALLOWED_EXTENSIONS: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  ALLOWED_MIME_TYPES: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
  ],
  MIN_WIDTH: 64,
  MAX_WIDTH: 3840,
  MIN_HEIGHT: 64,
  MAX_HEIGHT: 2160,
  MIN_FPS: 1.0,
  MAX_FPS: 120.0,
};

/**
 * Validates magic bytes / header signatures for common video containers
 */
export function validateVideoMagicBytes(buffer: Buffer): { valid: boolean; container?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // MP4 / MOV: Check for 'ftyp' or 'moov' at offset 4
  const sub = buffer.subarray(4, 8).toString('latin1');
  if (sub === 'ftyp' || sub === 'moov') {
    return { valid: true, container: 'mp4/mov' };
  }

  // RIFF (AVI): Check for 'RIFF' at offset 0 and 'AVI ' at offset 8
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'AVI ') {
    return { valid: true, container: 'avi' };
  }

  // Matroska / WebM: EBML header 0x1A 0x45 0xDF 0xA3
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return { valid: true, container: 'webm/mkv' };
  }

  return { valid: false };
}
