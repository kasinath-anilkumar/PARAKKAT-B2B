import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { accountLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as financeController from './finance.controller';

export const financeRouter = Router();

const pageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /finance/balance:
 *   get: { summary: Agency outstanding balance + credit availability, tags: [Finance], security: [{ bearerAuth: [] }] }
 */
financeRouter.get('/balance', authenticate, requireRole('AGENCY', 'AGENT'), asyncHandler(financeController.balance));

/**
 * @openapi
 * /finance/invoices:
 *   get: { summary: List the agency's invoices, tags: [Finance], security: [{ bearerAuth: [] }] }
 */
financeRouter.get(
  '/invoices',
  authenticate,
  requireRole('AGENCY', 'AGENT'),
  validate({ query: pageQuery }),
  asyncHandler(financeController.invoices),
);

/**
 * @openapi
 * /finance/invoices/{id}/settle:
 *   post: { summary: Settle (pay) an outstanding credit invoice (AGENCY), tags: [Finance], security: [{ bearerAuth: [] }] }
 */
financeRouter.post(
  '/invoices/:id/settle',
  authenticate,
  accountLimiter,
  requireRole('AGENCY'),
  validate({ params: idParam }),
  asyncHandler(financeController.settle),
);

/**
 * @openapi
 * /finance/reconciliation:
 *   get: { summary: Drift report across portal / AxisRooms / CRS (ADMIN), tags: [Finance], security: [{ bearerAuth: [] }] }
 */
financeRouter.get('/reconciliation', authenticate, requireRole('ADMIN'), asyncHandler(financeController.reconciliation));

/**
 * @openapi
 * /finance/crs/flush:
 *   post: { summary: Manually flush pending CRS outbox events (ADMIN), tags: [Finance], security: [{ bearerAuth: [] }] }
 */
financeRouter.post('/crs/flush', authenticate, requireRole('ADMIN'), asyncHandler(financeController.flushCrs));
