import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { availabilityQuerySchema } from '../booking/booking.schema';
import * as catalogController from './catalog.controller';

export const catalogRouter = Router();

/**
 * @openapi
 * /catalog/resorts:
 *   get:
 *     summary: List resorts (read-only from AxisRooms) — AGENT/AGENCY
 *     tags: [Catalog]
 *     security: [{ bearerAuth: [] }]
 */
catalogRouter.get(
  '/resorts',
  authenticate,
  requireRole('AGENT', 'AGENCY'),
  asyncHandler(catalogController.resorts),
);

/**
 * @openapi
 * /catalog/availability:
 *   get:
 *     summary: Search room availability with the agency price (AGENT/AGENCY)
 *     tags: [Catalog]
 *     security: [{ bearerAuth: [] }]
 */
catalogRouter.get(
  '/availability',
  authenticate,
  requireRole('AGENT', 'AGENCY'),
  validate({ query: availabilityQuerySchema }),
  asyncHandler(catalogController.availability),
);
