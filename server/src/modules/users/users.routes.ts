import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as usersController from './users.controller';

export const usersRouter = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get the authenticated user's own profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
usersRouter.get('/me', authenticate, asyncHandler(usersController.me));
