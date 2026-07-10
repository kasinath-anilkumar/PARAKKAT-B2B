import { authenticator } from 'otplib';
import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from '../../../src/utils/crypto';

// The DB-backed parts of mfa.service (startTotpSetup/confirmTotpSetup,
// email OTP request/confirm) are exercised end-to-end by
// tests/integration/auth.flow.test.ts against a real database. These tests
// cover the cryptographic core in isolation: TOTP generation/verification
// composed with our AES-256-GCM secret-at-rest encryption.

describe('MFA TOTP core', () => {
  it('accepts a code generated from the same secret', () => {
    const secret = authenticator.generateSecret();
    const code = authenticator.generate(secret);
    expect(authenticator.verify({ token: code, secret })).toBe(true);
  });

  it('rejects a code generated from a different secret', () => {
    const secretA = authenticator.generateSecret();
    const secretB = authenticator.generateSecret();
    const codeFromB = authenticator.generate(secretB);
    expect(authenticator.verify({ token: codeFromB, secret: secretA })).toBe(false);
  });

  it('rejects a malformed code', () => {
    const secret = authenticator.generateSecret();
    expect(authenticator.verify({ token: '000000', secret })).toBe(false);
  });

  it('round-trips a TOTP secret through encrypt-at-rest and still verifies', () => {
    const secret = authenticator.generateSecret();
    const encrypted = encryptSecret(secret);
    const decrypted = decryptSecret(encrypted);
    const code = authenticator.generate(decrypted);
    expect(authenticator.verify({ token: code, secret: decrypted })).toBe(true);
  });
});
