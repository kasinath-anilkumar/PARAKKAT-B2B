import crypto from 'node:crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  return Buffer.from(env.MFA_ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypts a plaintext secret (e.g. a TOTP secret) for storage at rest.
 * Output format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    ':',
  );
}

/**
 * Decrypts a secret produced by encryptSecret. Throws if the ciphertext has
 * been tampered with (GCM auth tag mismatch).
 */
export function decryptSecret(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted secret');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/** SHA-256 hex digest — used for refresh token hashes and OTP code hashes. */
export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Timing-safe comparison of two hex/utf8 strings of potentially differing lengths. */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Generates a random numeric OTP code of the given length (default 6 digits). */
export function generateNumericOtp(length = 6): string {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(length, '0');
}

/** Generates a URL-safe random token (used for refresh tokens). */
export function generateRandomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
