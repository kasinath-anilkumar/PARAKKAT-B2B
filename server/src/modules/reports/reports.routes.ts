import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { agencyReport, defaultReportRange, reportSummary } from './reports.service';

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

/**
 * @openapi
 * /reports/agency:
 *   get:
 *     summary: Agency-scoped booking / agent-performance / financial report (AGENCY)
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 */
reportsRouter.get(
  '/agency',
  authenticate,
  requireRole('AGENCY'),
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    if (!req.user!.agencyId) throw ApiError.forbidden('No agency for this user');
    const q = req.query as unknown as { from?: Date; to?: Date };
    const def = defaultReportRange();
    res.status(200).json(await agencyReport(req.user!.agencyId, { from: q.from ?? def.from, to: q.to ?? def.to }));
  }),
);
