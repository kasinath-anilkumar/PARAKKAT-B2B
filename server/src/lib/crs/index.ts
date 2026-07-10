import crypto from 'node:crypto';
import type { CrsEventType } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../logger';

/**
 * The CRS is the company's financial ledger of record (Instructions.md §3, §10).
 * The portal never keeps a second ledger — it posts financial events to the CRS.
 * Writes are idempotent on (correlationId, eventType) so retried outbox
 * deliveries never double-post. Mock only; the live client is a drop-in.
 */
export interface CrsEventInput {
  eventType: CrsEventType;
  correlationId: string;
  payload: Record<string, unknown>;
}

export interface CrsClient {
  postEvent(input: CrsEventInput): Promise<{ crsRef: string }>;
}

class MockCrsClient implements CrsClient {
  private posted = new Map<string, string>(); // `${correlationId}:${eventType}` -> crsRef

  async postEvent(input: CrsEventInput): Promise<{ crsRef: string }> {
    const key = `${input.correlationId}:${input.eventType}`;
    const existing = this.posted.get(key);
    if (existing) return { crsRef: existing };
    const crsRef = `CRS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    this.posted.set(key, crsRef);
    logger.info('[MockCRS] event posted', { eventType: input.eventType, correlationId: input.correlationId, crsRef });
    return { crsRef };
  }
}

class LiveCrsClient implements CrsClient {
  async postEvent(_input: CrsEventInput): Promise<{ crsRef: string }> {
    throw new Error('LiveCrsClient.postEvent is not implemented — provide CRS API contracts and set CRS_PROVIDER=live');
  }
}

let instance: CrsClient | undefined;
export function getCrs(): CrsClient {
  if (!instance) {
    instance = env.CRS_PROVIDER === 'live' ? new LiveCrsClient() : new MockCrsClient();
  }
  return instance;
}
