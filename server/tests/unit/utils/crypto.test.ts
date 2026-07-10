import { describe, expect, it } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  generateNumericOtp,
  sha256Hex,
  timingSafeEqual,
} from '../../../src/utils/crypto';

describe('crypto utils', () => {
  it('round-trips AES-256-GCM encrypt/decrypt', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toEqual(plaintext);
    expect(decryptSecret(encrypted)).toEqual(plaintext);
  });

  it('detects tampering via the GCM auth tag', () => {
    const encrypted = encryptSecret('some-secret');
    const [iv, authTag] = encrypted.split(':');
    const tampered = [iv, authTag, Buffer.from('tampered').toString('base64')].join(':');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('sha256Hex is deterministic', () => {
    expect(sha256Hex('hello')).toEqual(sha256Hex('hello'));
    expect(sha256Hex('hello')).not.toEqual(sha256Hex('world'));
  });

  it('timingSafeEqual compares correctly', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('generateNumericOtp produces a code of the requested length', () => {
    const code = generateNumericOtp(6);
    expect(code).toMatch(/^\d{6}$/);
  });
});
