import { describe, it, expect } from 'vitest';
import { encryptCredential, decryptCredential } from '../../src/utils/encryption';

describe('AES-256-GCM Encryption Utility', () => {
  it('should encrypt and decrypt sensitive RTSP camera URLs with integrity', () => {
    const rawRtsp = 'rtsp://admin:SecurityPass2026@192.168.1.104:554/live/ch0';
    const encrypted = encryptCredential(rawRtsp);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(rawRtsp);
    expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toEqual(rawRtsp);
  });

  it('should throw an error if ciphertext format is tampered', () => {
    expect(() => decryptCredential('invalid-format')).toThrow('Invalid ciphertext format');
  });

  it('should fail authentication if tag is corrupted', () => {
    const rawRtsp = 'rtsp://user:pass@camera.local:554/feed';
    const encrypted = encryptCredential(rawRtsp);
    const [iv, , ciphertext] = encrypted.split(':');
    const fakeTag = '00000000000000000000000000000000';

    expect(() => decryptCredential(`${iv}:${fakeTag}:${ciphertext}`)).toThrow();
  });
});
