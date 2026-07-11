import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as supportController from './support.controller';
import { addMessageSchema, createTicketSchema, listQuerySchema, ticketIdParamSchema, updateStatusSchema } from './support.schema';

export const supportRouter = Router();

const anyRole = [authenticate, requireRole('ADMIN', 'AGENCY', 'AGENT')] as const;

/** Raise a ticket (AGENCY/AGENT). */
supportRouter.post('/', authenticate, requireRole('AGENCY', 'AGENT'), validate({ body: createTicketSchema }), asyncHandler(supportController.create));

/** List tickets — admin sees all; agency/agent see their own agency's. */
supportRouter.get('/', ...anyRole, validate({ query: listQuerySchema }), asyncHandler(supportController.list));

/** Get one ticket with its thread (internal notes hidden from non-admins). */
supportRouter.get('/:id', ...anyRole, validate({ params: ticketIdParamSchema }), asyncHandler(supportController.getOne));

/** Reply on a ticket. Admins may flag a message as an internal note. */
supportRouter.post('/:id/messages', ...anyRole, validate({ params: ticketIdParamSchema, body: addMessageSchema }), asyncHandler(supportController.reply));

/** Change ticket status (ADMIN). */
supportRouter.post('/:id/status', authenticate, requireRole('ADMIN'), validate({ params: ticketIdParamSchema, body: updateStatusSchema }), asyncHandler(supportController.setStatus));
