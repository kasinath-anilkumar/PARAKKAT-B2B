import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { defaultReportRange, reportSummary } from './reports.service';

export const reportsRouter = Router();

const rangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/**
 * @openapi
 * /reports/summary:
 *   get:
 *     summary: Revenue + bookings by agency and resort over a date range (ADMIN)
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 */
reportsRouter.get(
  '/summary',
  authenticate,
  requireRole('ADMIN'),
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { from?: Date; to?: Date };
    const def = defaultReportRange();
    res.status(200).json(await reportSummary({ from: q.from ?? def.from, to: q.to ?? def.to }));
  }),
);
