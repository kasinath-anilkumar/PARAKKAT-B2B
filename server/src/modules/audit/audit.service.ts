import type { ActorRole, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getCorrelationId } from '../../lib/correlationContext';
import { logger } from '../../lib/logger';

export interface RecordAuditLogInput {
  entityType: string;
  entityId: string;
  event: string;
  actorId?: string | null;
  actorRole: ActorRole;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}

/**
 * Single write path for AuditLog — append-only (only `.create` is ever
 * called here; no update/delete is exported from this module or exposed by
 * any route). Every mutating service function must call this explicitly
 * (see modules/audit/README.md) rather than relying on generic middleware,
 * so event names stay meaningful and the call site is reviewable in PRs.
 */
export async function recordAuditLog(
  input: RecordAuditLogInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      event: input.event,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      correlationId: getCorrelationId() ?? null,
    },
  });
}

/**
 * Same as recordAuditLog but never throws — for high-volume/low-stakes
 * events (e.g. LOGIN_SUCCESS) where an audit-log hiccup must not break the
 * user-facing operation. Critical paths should instead run recordAuditLog
 * inside the same $transaction as the mutation it documents.
 */
export async function recordAuditLogSafe(input: RecordAuditLogInput): Promise<void> {
  try {
    await recordAuditLog(input);
  } catch (err) {
    logger.error('Failed to write audit log (non-fatal)', {
      event: input.event,
      entityType: input.entityType,
      entityId: input.entityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
