import { z } from 'zod';

const rate = z.object({
  plan: z.enum(['EP', 'CP', 'MAP', 'AP']),
  baseRate: z.number().nonnegative(),
});

// v3 §2.2 — child age band: inclusive [minAge, maxAge] → per-night charge.
const childBand = z
  .object({
    minAge: z.number().int().min(0).max(17),
    maxAge: z.number().int().min(0).max(17),
    charge: z.number().nonnegative(),
  })
  .refine((b) => b.maxAge >= b.minAge, { message: 'maxAge must be ≥ minAge' });

export const upsertPricingSchema = z
  .object({
    resortId: z.string().min(1),
    roomTypeId: z.string().min(1),
    roomTypeName: z.string().min(1),
    baseOccupancy: z.number().int().min(1).max(10),
    maxAdults: z.number().int().min(1).max(20),
    maxChildren: z.number().int().min(0).max(20),
    maxOccupancy: z.number().int().min(1).max(30),
    extraAdultCharge: z.number().nonnegative(),
    childCharge: z.number().nonnegative(),
    extraBedCharge: z.number().nonnegative(),
    childBands: z.array(childBand).max(6).optional(),
    rates: z.array(rate).min(1),
  })
  .refine((v) => v.maxOccupancy >= v.baseOccupancy, { message: 'maxOccupancy must be ≥ baseOccupancy' });

export const pricingIdParamSchema = z.object({ id: z.string().uuid() });

// v3 §2.4 — rate-calendar bulk tooling.
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const rateCalendarSchema = z
  .object({
    resortId: z.string().min(1),
    roomTypeIds: z.array(z.string().min(1)).min(1),
    plans: z.array(z.enum(['EP', 'CP', 'MAP', 'AP'])).min(1),
    baseRate: z.number().nonnegative(),
    effectiveFrom: ymd,
    effectiveTo: ymd,
    note: z.string().max(200).optional(),
  })
  .refine((v) => v.effectiveTo >= v.effectiveFrom, { message: 'effectiveTo must be on or after effectiveFrom' });

export const rateCalendarQuerySchema = z.object({ resortId: z.string().min(1).optional() });
