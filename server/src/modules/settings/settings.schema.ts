import { z } from 'zod';

/** Per-group update schemas. All fields optional (partial patch), but at least one required. */
export const companySchema = z
  .object({
    name: z.string().min(1).max(160),
    addressLine1: z.string().max(160),
    addressLine2: z.string().max(160),
    gstin: z.string().max(20),
    email: z.string().email(),
    phone: z.string().max(40),
    website: z.string().max(200),
  })
  .partial();

export const financialSchema = z
  .object({
    gstNumber: z.string().max(20),
    defaultGstRate: z.number().min(0).max(28),
    currency: z.string().max(10),
    invoiceNumberFormat: z.string().min(3).max(60),
  })
  .partial();

export const bookingSchema = z
  .object({
    bookingWindowDays: z.number().int().min(1).max(1095),
    checkInTime: z.string().max(20),
    checkOutTime: z.string().max(20),
  })
  .partial();

export const portalSchema = z
  .object({
    maintenanceMode: z.boolean(),
    termsUrl: z.string().max(200),
    privacyUrl: z.string().max(200),
  })
  .partial();

export const securitySchema = z
  .object({
    mfaEnabled: z.boolean(),
    enforceAdmin: z.boolean(),
    enforceAgency: z.boolean(),
    enforceAgent: z.boolean(),
  })
  .partial();

export const GROUP_SCHEMAS = {
  company: companySchema,
  financial: financialSchema,
  booking: bookingSchema,
  portal: portalSchema,
  security: securitySchema,
} as const;

export const groupParamSchema = z.object({
  group: z.enum(['company', 'financial', 'booking', 'portal', 'security']),
});
