import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createPolicySchema = z
  .object({
    resortId: z.string().min(1),
    roomTypeId: z.string().min(1).optional(),
    kind: z.enum(['STOP_SELL', 'CAP']),
    startDate: dateString,
    endDate: dateString,
    capPerDay: z.number().int().min(0).optional(),
    note: z.string().max(500).optional(),
  })
  .refine((v) => v.kind !== 'CAP' || v.capPerDay != null, { message: 'capPerDay is required for a CAP policy' })
  .refine((v) => v.startDate <= v.endDate, { message: 'startDate must be on or before endDate' });

export const createAllotmentSchema = z
  .object({
    agencyId: z.string().uuid(),
    resortId: z.string().min(1),
    roomTypeId: z.string().min(1),
    startDate: dateString,
    endDate: dateString,
    rooms: z.number().int().positive().max(1000),
    releaseDate: dateString.optional(),
    note: z.string().max(500).optional(),
  })
  .refine((v) => v.startDate <= v.endDate, { message: 'startDate must be on or before endDate' });

export const inventoryIdParamSchema = z.object({ id: z.string().uuid() });
