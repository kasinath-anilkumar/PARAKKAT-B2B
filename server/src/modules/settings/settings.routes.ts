import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './settings.controller';
import { groupParamSchema } from './settings.schema';

export const settingsRouter = Router();

const adminOnly = [authenticate, requireRole('ADMIN')] as const;

/** All system settings (company / financial / booking / portal). */
settingsRouter.get('/', ...adminOnly, asyncHandler(controller.getSettings));

/** Update one settings group. Body is validated against the group's schema. */
settingsRouter.put(
  '/:group',
  ...adminOnly,
  validate({ params: groupParamSchema }),
  asyncHandler(controller.updateSettings),
);
