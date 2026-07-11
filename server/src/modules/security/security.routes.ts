import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './security.controller';

export const securityRouter = Router();

const adminOnly = [authenticate, requireRole('ADMIN')] as const;

/** Active login sessions across all users. */
securityRouter.get('/sessions', ...adminOnly, asyncHandler(controller.sessions));

/** Revoke a specific session (refresh token). */
securityRouter.post('/sessions/:id/revoke', ...adminOnly, validate({ params: z.object({ id: z.string().uuid() }) }), asyncHandler(controller.revokeSession));

/** Recent failed-login attempts, grouped by user. */
securityRouter.get('/failed-logins', ...adminOnly, asyncHandler(controller.failedLogins));

/** Effective authentication/security policy. */
securityRouter.get('/policy', ...adminOnly, asyncHandler(controller.policy));

/** Live third-party integration status. */
securityRouter.get('/integrations', ...adminOnly, asyncHandler(controller.integrations));
