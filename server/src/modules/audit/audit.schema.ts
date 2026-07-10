import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().optional(),
  actorRole: z.enum(['ADMIN', 'VERIFIER', 'AGENCY', 'AGENT', 'APPLICANT', 'SYSTEM', 'DIGIO']).optional(),
  // Case-insensitive substring match on the event name (e.g. "BOOKING", "LIFECYCLE").
  event: z.string().optional(),
  correlationId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
