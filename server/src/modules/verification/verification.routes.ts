import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as verificationController from './verification.controller';
import {
  applicationIdParamSchema,
  overrideParamSchema,
  overrideSchema,
} from './verification.schema';

// Mounted under /api/applications/:id/verifications
export const verificationRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /applications/{id}/verifications/initiate:
 *   post:
 *     summary: (Re)initiate the Digio checks for an application (ADMIN)
 *     tags: [Verification]
 *     security: [{ bearerAuth: [] }]
 */
verificationRouter.post(
  '/initiate',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: applicationIdParamSchema }),
  asyncHandler(verificationController.initiate),
);

/**
 * @openapi
 * /applications/{id}/verifications/{checkType}/override:
 *   post:
 *     summary: Manually override a single check's result (ADMIN/VERIFIER)
 *     tags: [Verification]
 *     security: [{ bearerAuth: [] }]
 */
verificationRouter.post(
  '/:checkType/override',
  authenticate,
  requireRole('ADMIN', 'VERIFIER'),
  validate({ params: overrideParamSchema, body: overrideSchema }),
  asyncHandler(verificationController.override),
);
