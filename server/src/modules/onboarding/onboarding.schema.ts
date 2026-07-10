import { z } from 'zod';

// --- Field-level validators (Indian formats) ---
export const gstinSchema = z
  .string()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GSTIN format',
  );

export const panSchema = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format');

export const ifscSchema = z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format');

export const mobileSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number');

export const postalCodeSchema = z.string().regex(/^\d{6}$/, 'Invalid postal code');

// --- Draft (partial): every field optional so a draft can be filled incrementally ---
export const draftInputSchema = z
  .object({
    legalName: z.string().min(2).max(200),
    gstin: gstinSchema,
    pan: panSchema,
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().max(200),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    postalCode: postalCodeSchema,
    country: z.string().min(1).max(100),
    businessContactEmail: z.string().email(),
    businessContactPhone: mobileSchema,
    repName: z.string().min(2).max(200),
    repDesignation: z.string().min(1).max(100),
    repEmail: z.string().email(),
    repMobile: mobileSchema,
    // Opaque reference/token for Aadhaar eKYC — never the raw 12-digit number.
    repAadhaarRef: z.string().min(1).max(100),
    bankAccount: z.string().min(6).max(30),
    ifsc: ifscSchema,
    accountHolder: z.string().min(2).max(200),
  })
  .partial();

export type DraftInput = z.infer<typeof draftInputSchema>;

// --- Submit (full): all fields required and well-formed. addressLine2 stays optional. ---
export const submitApplicationSchema = draftInputSchema.required().extend({
  addressLine2: z.string().max(200).optional(),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

export const applicationIdParamSchema = z.object({
  id: z.string().uuid(),
});
