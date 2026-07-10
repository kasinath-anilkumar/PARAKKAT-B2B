import { describe, expect, it } from 'vitest';
import { signDigioBody, verifyDigioSignature } from '../../../src/lib/digio/signature';

describe('Digio webhook signature', () => {
  const secret = 'test-secret';
  const body = Buffer.from(JSON.stringify({ providerRef: 'mock-gst-1', status: 'passed' }));

  it('verifies a correctly-signed body', () => {
    const sig = signDigioBody(body, secret);
    expect(verifyDigioSignature(body, sig, secret)).toBe(true);
  });

  it('rejects a wrong signature', () => {
    expect(verifyDigioSignature(body, 'deadbeef', secret)).toBe(false);
  });

  it('rejects when signature is signed with a different secret', () => {
    const sig = signDigioBody(body, 'other-secret');
    expect(verifyDigioSignature(body, sig, secret)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const sig = signDigioBody(body, secret);
    const tampered = Buffer.from(JSON.stringify({ providerRef: 'mock-gst-1', status: 'failed' }));
    expect(verifyDigioSignature(tampered, sig, secret)).toBe(false);
  });

  it('returns false for a missing signature or body', () => {
    expect(verifyDigioSignature(body, undefined, secret)).toBe(false);
    expect(verifyDigioSignature(undefined, 'abc', secret)).toBe(false);
  });
});
