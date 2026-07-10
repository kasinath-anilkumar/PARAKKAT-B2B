import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as applicationsController from './applications.controller';
import { applicationIdParamSchema, listApplicationsQuerySchema } from './applications.schema';

export const applicationsRouter = Router();

/**
 * @openapi
 * /applications:
 *   get:
 *     summary: List agency applications, filterable by lifecycle state (ADMIN/VERIFIER)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 */
applicationsRouter.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'VERIFIER'),
  validate({ query: listApplicationsQuerySchema }),
  asyncHandler(applicationsController.list),
);

/**
 * @openapi
 * /applications/{id}:
 *   get:
 *     summary: Application detail with verifications + documents, PII masked (ADMIN/VERIFIER)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 */
applicationsRouter.get(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'VERIFIER'),
  validate({ params: applicationIdParamSchema }),
  asyncHandler(applicationsController.getById),
);
