import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './notification.controller';

export const notificationsRouter = Router();

const anyRole = [authenticate, requireRole('ADMIN', 'VERIFIER', 'AGENCY', 'AGENT')] as const;

/** In-app inbox — admin sees ADMIN-audience items; agency/agent see their agency's. */
notificationsRouter.get('/', ...anyRole, asyncHandler(controller.list));
notificationsRouter.get('/unread-count', ...anyRole, asyncHandler(controller.unread));
notificationsRouter.post('/:id/read', ...anyRole, validate({ params: z.object({ id: z.string().uuid() }) }), asyncHandler(controller.read));
notificationsRouter.post('/read-all', ...anyRole, asyncHandler(controller.readAll));

/** Admin broadcast to agencies' inboxes. */
notificationsRouter.post(
  '/broadcast',
  authenticate,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      subject: z.string().min(3).max(160),
      body: z.string().min(1).max(2000),
      agencyIds: z.array(z.string().uuid()).optional(),
    }),
  }),
  asyncHandler(controller.broadcast),
);
