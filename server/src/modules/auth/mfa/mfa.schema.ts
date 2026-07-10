import { z } from 'zod';

export const otpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export type OtpCodeInput = z.infer<typeof otpCodeSchema>;
