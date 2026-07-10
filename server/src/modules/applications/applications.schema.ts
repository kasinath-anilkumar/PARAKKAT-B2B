import { z } from 'zod';

export const listApplicationsQuerySchema = z.object({
  lifecycleState: z
    .enum([
      'DRAFT',
      'VERIFICATION',
      'REVIEW',
      'APPROVED',
      'COMMERCIAL_CONFIGURATION',
      'ACTIVE',
      'REJECTED',
      'SUSPENDED',
    ])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

export const applicationIdParamSchema = z.object({ id: z.string().uuid() });
