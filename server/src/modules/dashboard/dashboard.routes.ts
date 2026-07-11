import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { adminSummary, agencySummary, defaultRange } from './dashboard.service';

export const dashboardRouter = Router();

/**
 * @openapi
 * /dashboard/admin:
 *   get: { summary: Company-wide dashboard metrics (ADMIN/VERIFIER), tags: [Dashboard], security: [{ bearerAuth: [] }] }
 */
dashboardRouter.get(
  '/admin',
  authenticate,
  requireRole('ADMIN', 'VERIFIER'),
  asyncHandler(async (_req, res) => {
    res.status(200).json(await adminSummary(defaultRange()));
  }),
);

/**
 * @openapi
 * /dashboard/agency:
 *   get: { summary: Agency-scoped dashboard metrics (AGENCY/AGENT), tags: [Dashboard], security: [{ bearerAuth: [] }] }
 */
dashboardRouter.get(
  '/agency',
  authenticate,
  requireRole('AGENCY', 'AGENT'),
  asyncHandler(async (req, res) => {
    if (!req.user!.agencyId) throw ApiError.forbidden('No agency for this user');
    res.status(200).json(await agencySummary(req.user!.agencyId, defaultRange()));
  }),
);

/**
 * @openapi
 * /dashboard/agent:
 *   get: { summary: Agent's own overview — booking metrics scoped to the agent (AGENT), tags: [Dashboard], security: [{ bearerAuth: [] }] }
 */
dashboardRouter.get(
  '/agent',
  authenticate,
  requireRole('AGENT'),
  asyncHandler(async (req, res) => {
    if (!req.user!.agencyId) throw ApiError.forbidden('No agency for this user');
    res.status(200).json(await agencySummary(req.user!.agencyId, defaultRange(), req.user!.id));
  }),
);
