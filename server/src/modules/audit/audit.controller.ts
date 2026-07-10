import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { ListAuditLogsQuery } from './audit.schema';

export async function list(req: Request, res: Response): Promise<void> {
  const q = req.query as unknown as ListAuditLogsQuery;

  const where: Prisma.AuditLogWhereInput = {
    ...(q.entityType ? { entityType: q.entityType } : {}),
    ...(q.entityId ? { entityId: q.entityId } : {}),
    ...(q.actorId ? { actorId: q.actorId } : {}),
    ...(q.actorRole ? { actorRole: q.actorRole } : {}),
    ...(q.event ? { event: { contains: q.event, mode: 'insensitive' } } : {}),
    ...(q.correlationId ? { correlationId: q.correlationId } : {}),
    ...(q.from || q.to
      ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.status(200).json({ items, total, page: q.page, pageSize: q.pageSize });
}
