import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as auditController from './audit.controller';
import { listAuditLogsQuerySchema } from './audit.schema';

export const auditRouter = Router();

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: Query the append-only audit log (ADMIN only)
 *     tags: [Audit]
 *     security: [{ bearerAuth: [] }]
 */
auditRouter.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate({ query: listAuditLogsQuerySchema }),
  asyncHandler(auditController.list),
);
