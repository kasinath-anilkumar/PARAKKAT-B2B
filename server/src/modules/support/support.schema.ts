import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(3).max(160),
  category: z.string().max(60).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  body: z.string().min(1).max(4000),
});

export const addMessageSchema = z.object({
  body: z.string().min(1).max(4000),
  internal: z.boolean().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']),
});

export const listQuerySchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']).optional(),
  q: z.string().max(120).optional(),
});

export const ticketIdParamSchema = z.object({ id: z.string().uuid() });
