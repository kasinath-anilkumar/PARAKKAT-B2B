import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as pricingController from './pricing.controller';
import { pricingIdParamSchema, rateCalendarQuerySchema, rateCalendarSchema, upsertPricingSchema } from './pricing.schema';

export const pricingRouter = Router();

const admin = [authenticate, requireRole('ADMIN')] as const;

/** List portal-managed room-type pricing configs (ADMIN). */
pricingRouter.get('/room-types', ...admin, asyncHandler(pricingController.list));

/** Create/update a room-type pricing config + its plan rates (ADMIN). */
pricingRouter.post('/room-types', ...admin, validate({ body: upsertPricingSchema }), asyncHandler(pricingController.upsert));

/** Delete a room-type pricing config (ADMIN). */
pricingRouter.delete('/room-types/:id', ...admin, validate({ params: pricingIdParamSchema }), asyncHandler(pricingController.remove));

/** v3 §2.4 — list dated rate-calendar windows (ADMIN). */
pricingRouter.get('/rate-calendar', ...admin, validate({ query: rateCalendarQuerySchema }), asyncHandler(pricingController.listCalendar));

/** v3 §2.4 — bulk-apply a dated rate window across room types & plans (ADMIN). */
pricingRouter.post('/rate-calendar', ...admin, validate({ body: rateCalendarSchema }), asyncHandler(pricingController.applyCalendar));

/** v3 §2.4 — delete a dated rate window (ADMIN). */
pricingRouter.delete('/rate-calendar/:id', ...admin, validate({ params: pricingIdParamSchema }), asyncHandler(pricingController.removeWindow));
