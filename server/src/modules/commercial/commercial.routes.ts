import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../utils/asyncHandler';
import { getTiers } from './tiers';

export const commercialRouter = Router();

/**
 * @openapi
 * /commercial/tiers:
 *   get:
 *     summary: List configured tier presets used to populate commercial terms (ADMIN)
 *     tags: [Commercial]
 *     security: [{ bearerAuth: [] }]
 */
commercialRouter.get(
  '/tiers',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    res.status(200).json({ tiers: getTiers() });
  }),
);
