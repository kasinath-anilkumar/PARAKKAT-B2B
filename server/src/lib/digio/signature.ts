import crypto from 'node:crypto';
import { env } from '../../config/env';

/**
 * Digio webhook signature = hex HMAC-SHA256 of the raw request body using the
 * shared webhook secret. verify() is timing-safe and never throws on a bad
 * signature — it returns false so the caller can reject + log without a state
 * change (Instructions.md §11).
 */
export function signDigioBody(rawBody: string | Buffer, secret = env.DIGIO_WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyDigioSignature(
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret = env.DIGIO_WEBHOOK_SECRET,
): boolean {
  if (!rawBody || !signature) return false;
  const expected = signDigioBody(rawBody, secret);
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature);
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
