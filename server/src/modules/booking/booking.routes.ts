import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { accountLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as bookingController from './booking.controller';
import {
  bookingIdParamSchema,
  createBookingSchema,
  listBookingsQuerySchema,
} from './booking.schema';

export const bookingRouter = Router();

const agencySide = [authenticate, accountLimiter, requireRole('AGENT', 'AGENCY')] as const;

/**
 * @openapi
 * /bookings:
 *   post:
 *     summary: Create a booking — runs the unified credit gate (AGENT/AGENCY)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 */
bookingRouter.post(
  '/',
  ...agencySide,
  validate({ body: createBookingSchema }),
  asyncHandler(bookingController.create),
);

/**
 * @openapi
 * /bookings:
 *   get:
 *     summary: List the agency's bookings (AGENT/AGENCY)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 */
bookingRouter.get(
  '/',
  ...agencySide,
  validate({ query: listBookingsQuerySchema }),
  asyncHandler(bookingController.list),
);

/**
 * @openapi
 * /bookings/{id}:
 *   get:
 *     summary: Get a booking (AGENT/AGENCY, own agency only)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 */
bookingRouter.get(
  '/:id',
  ...agencySide,
  validate({ params: bookingIdParamSchema }),
  asyncHandler(bookingController.getById),
);

/**
 * @openapi
 * /bookings/{id}/pay:
 *   post:
 *     summary: Pay for a pay-first booking, then commit to AxisRooms (AGENT/AGENCY)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 */
bookingRouter.post(
  '/:id/pay',
  ...agencySide,
  validate({ params: bookingIdParamSchema }),
  asyncHandler(bookingController.pay),
);

/**
 * @openapi
 * /bookings/{id}/cancel:
 *   post:
 *     summary: Cancel a booking (reverses AxisRooms if committed) (AGENT/AGENCY)
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 */
bookingRouter.post(
  '/:id/cancel',
  ...agencySide,
  validate({ params: bookingIdParamSchema }),
  asyncHandler(bookingController.cancel),
);
