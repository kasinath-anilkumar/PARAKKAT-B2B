import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authController from './auth.controller';
import { loginSchema, mfaVerifySchema } from './auth.schema';
import { mfaRouter } from './mfa/mfa.routes';

export const authRouter = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email + password. May return tokens directly, an
 *       MFA challenge, or an MFA-setup-required response for roles that
 *       mandate MFA but haven't enabled it yet.
 *     tags: [Auth]
 */
authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);

/**
 * @openapi
 * /auth/mfa/verify:
 *   post:
 *     summary: Complete login by verifying an MFA code against the pending token
 *     tags: [Auth]
 */
authRouter.post(
  '/mfa/verify',
  authLimiter,
  validate({ body: mfaVerifySchema }),
  asyncHandler(authController.verifyMfa),
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate the refresh token (from httpOnly cookie) and issue a new access token
 *     tags: [Auth]
 */
authRouter.post('/refresh', authLimiter, asyncHandler(authController.refresh));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current refresh token and clear the cookie
 *     tags: [Auth]
 */
authRouter.post('/logout', asyncHandler(authController.logout));

authRouter.use('/mfa', mfaRouter);
