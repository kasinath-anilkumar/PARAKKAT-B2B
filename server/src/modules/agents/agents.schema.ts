import { z } from 'zod';
import { strongPasswordSchema } from '../auth/passwordPolicy';

const permissions = z
  .object({
    canBook: z.boolean(),
    canCancel: z.boolean(),
    canModify: z.boolean(),
    canViewReports: z.boolean(),
  })
  .partial();

export const createAgentSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: strongPasswordSchema.optional(), // v3 §10.2 — policy-enforced when provided
  agencyId: z.string().uuid().optional(), // required only when an ADMIN creates
  permissions: permissions.optional(),
});

export const updateAgentSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    permissions: permissions.optional(),
  })
  .refine((v) => v.name !== undefined || v.permissions !== undefined, {
    message: 'Nothing to update',
  });

export const agentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export const agentIdParamSchema = z.object({
  id: z.string().uuid(),
});
