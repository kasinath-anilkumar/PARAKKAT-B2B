import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as inventoryController from './inventory.controller';
import { createAllotmentSchema, createPolicySchema, inventoryIdParamSchema } from './inventory.schema';

export const inventoryRouter = Router();

const admin = [authenticate, requireRole('ADMIN')] as const;

// Stop-sell / cap policies
inventoryRouter.get('/policies', ...admin, asyncHandler(inventoryController.listPolicies));
inventoryRouter.post('/policies', ...admin, validate({ body: createPolicySchema }), asyncHandler(inventoryController.createPolicy));
inventoryRouter.delete('/policies/:id', ...admin, validate({ params: inventoryIdParamSchema }), asyncHandler(inventoryController.deletePolicy));

// Per-agency allotments (§4.2)
inventoryRouter.get('/allotments', ...admin, asyncHandler(inventoryController.listAllotments));
inventoryRouter.post('/allotments', ...admin, validate({ body: createAllotmentSchema }), asyncHandler(inventoryController.createAllotment));
inventoryRouter.delete('/allotments/:id', ...admin, validate({ params: inventoryIdParamSchema }), asyncHandler(inventoryController.deleteAllotment));
