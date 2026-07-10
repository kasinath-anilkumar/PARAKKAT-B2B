import type { CrsEventType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getCrs } from '../../lib/crs';
import { logger } from '../../lib/logger';

const MAX_ATTEMPTS = 5;

/**
 * Writes a CRS event to the outbox in the SAME transaction as the financial
 * change (so a booking/payment and its ledger event commit atomically), to be
 * delivered by flushOutbox — inline after the change and/or by the worker.
 */
export async function enqueueCrsEvent(
  tx: Prisma.TransactionClient,
  input: { eventType: CrsEventType; correlationId: string; payload: Record<string, unknown> },
): Promise<void> {
  await tx.crsOutboxEvent.create({
    data: {
      eventType: input.eventType,
      correlationId: input.correlationId,
      payload: input.payload as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });
}

/**
 * Delivers pending outbox events to the CRS. Idempotent at the CRS boundary
 * (keyed on correlationId+eventType) so re-delivery is safe. Failures increment
 * attempts and are retried until MAX_ATTEMPTS, then parked as FAILED for the
 * reconciliation report. Returns counts for observability.
 */
export async function flushOutbox(limit = 50): Promise<{ sent: number; failed: number }> {
  const pending = await prisma.crsOutboxEvent.findMany({
    where: { status: 'PENDING', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  const crs = getCrs();

  for (const event of pending) {
    try {
      const { crsRef } = await crs.postEvent({
        eventType: event.eventType,
        correlationId: event.correlationId,
        payload: event.payload as Record<string, unknown>,
      });
      await prisma.crsOutboxEvent.update({
        where: { id: event.id },
        data: { status: 'SENT', sentAt: new Date(), attempts: event.attempts + 1, lastError: null },
      });
      logger.info('CRS outbox event delivered', { id: event.id, crsRef });
      sent += 1;
    } catch (err) {
      const attempts = event.attempts + 1;
      const message = err instanceof Error ? err.message : String(err);
      await prisma.crsOutboxEvent.update({
        where: { id: event.id },
        data: {
          attempts,
          lastError: message,
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        },
      });
      logger.error('CRS outbox delivery failed', { id: event.id, attempts, error: message });
      failed += 1;
    }
  }

  return { sent, failed };
}
