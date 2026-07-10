import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireOwnAgency, requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as agenciesController from './agencies.controller';
import { gstinSchema, mobileSchema, panSchema } from '../onboarding/onboarding.schema';

export const agenciesRouter = Router();

const createAgencySchema = z.object({
  legalName: z.string().min(2).max(200),
  gstin: gstinSchema,
  pan: panSchema,
  contactEmail: z.string().email(),
  contactPhone: mobileSchema,
});

/**
 * @openapi
 * /agencies:
 *   get:
 *     summary: List agencies (ADMIN/VERIFIER only)
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 */
agenciesRouter.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'VERIFIER'),
  asyncHandler(agenciesController.list),
);

/**
 * @openapi
 * /agencies:
 *   post:
 *     summary: Admin-create an agency directly (D7 exception path) (ADMIN)
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 */
agenciesRouter.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createAgencySchema }),
  asyncHandler(agenciesController.create),
);

/**
 * @openapi
 * /agencies/{id}:
 *   get:
 *     summary: Get an agency by id (ADMIN/VERIFIER, or AGENCY/AGENT for their own agency)
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 */
agenciesRouter.get(
  '/:id',
  authenticate,
  requireOwnAgency((req) => req.params.id),
  asyncHandler(agenciesController.getById),
);

/**
 * @openapi
 * /agencies/{id}/suspend:
 *   post:
 *     summary: Suspend an active agency — blocks transacting, reversible (ADMIN)
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 */
agenciesRouter.post(
  '/:id/suspend',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(agenciesController.suspend),
);

/**
 * @openapi
 * /agencies/{id}/reactivate:
 *   post:
 *     summary: Reactivate a suspended agency (ADMIN)
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 */
agenciesRouter.post(
  '/:id/reactivate',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(agenciesController.reactivate),
);

/**
 * @openapi
 * /agencies/{id}:
 *   delete:
 *     summary: Delete an agency with no financial history (ADMIN)
 *     tags: [Agencies]
 *     security: [{ bearerAuth: [] }]
 */
agenciesRouter.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(agenciesController.remove),
);
