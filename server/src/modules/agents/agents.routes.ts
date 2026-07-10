import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as agentsController from './agents.controller';
import { agentIdParamSchema, agentStatusSchema, createAgentSchema, updateAgentSchema } from './agents.schema';

export const agentsRouter = Router();

const manage = [authenticate, requireRole('AGENCY', 'ADMIN')] as const;

/** List the caller agency's own agents (AGENCY). */
agentsRouter.get('/', authenticate, requireRole('AGENCY'), asyncHandler(agentsController.list));

/** List all agents across agencies (ADMIN). */
agentsRouter.get('/all', authenticate, requireRole('ADMIN'), asyncHandler(agentsController.listAll));

/** Create an agent (AGENCY → own agency; ADMIN → must pass agencyId). */
agentsRouter.post('/', ...manage, validate({ body: createAgentSchema }), asyncHandler(agentsController.create));

/** Update an agent's name / permissions. */
agentsRouter.patch('/:id', ...manage, validate({ params: agentIdParamSchema, body: updateAgentSchema }), asyncHandler(agentsController.update));

/** Enable / disable (SUSPENDED) an agent. */
agentsRouter.post('/:id/status', ...manage, validate({ params: agentIdParamSchema, body: agentStatusSchema }), asyncHandler(agentsController.setStatus));

/** Reset an agent's password → returns a one-time temp password. */
agentsRouter.post('/:id/reset-password', ...manage, validate({ params: agentIdParamSchema }), asyncHandler(agentsController.resetPassword));

/** Force-logout an agent (revokes all refresh tokens). */
agentsRouter.post('/:id/force-logout', ...manage, validate({ params: agentIdParamSchema }), asyncHandler(agentsController.forceLogout));

/** Delete an agent (only when they have no bookings / audit history). */
agentsRouter.delete('/:id', ...manage, validate({ params: agentIdParamSchema }), asyncHandler(agentsController.remove));
