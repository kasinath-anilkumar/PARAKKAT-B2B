import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const mfaVerifySchema = z.object({
  mfaPendingToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

// v3 §10.2 — self-service password change (policy enforced in the service).
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1).max(200),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
