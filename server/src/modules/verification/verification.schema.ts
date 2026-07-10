import { z } from 'zod';

export const checkTypeSchema = z.enum(['GST', 'PAN', 'AADHAAR_EKYC', 'BANK', 'DOCUMENT', 'ESIGN']);

export const digioWebhookSchema = z.object({
  providerRef: z.string().min(1),
  checkType: checkTypeSchema.optional(),
  status: z.enum(['passed', 'failed', 'manual_review']),
  data: z.record(z.unknown()).optional(),
});

export const overrideSchema = z.object({
  status: z.enum(['PASSED', 'FAILED', 'MANUAL_REVIEW']),
});

export const applicationIdParamSchema = z.object({ id: z.string().uuid() });

export const overrideParamSchema = z.object({
  id: z.string().uuid(),
  checkType: checkTypeSchema,
});
