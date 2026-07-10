import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import type { AuthUser } from '../../types/express';
import { checkTypeSchema } from '../verification/verification.schema';
import * as review from '../review/review.service';
import * as commercial from '../commercial/commercial.service';
import * as agreement from '../agreement/agreement.service';

// Mounted under /api/applications/:id
export const applicationActionsRouter = Router({ mergeParams: true });

function actorFrom(user: AuthUser) {
  return { actorId: user.id, actorRole: user.role };
}

const idParam = z.object({ id: z.string().uuid() });
const rejectBody = z.object({ reason: z.string().min(3).max(1000) });
const resubmitBody = z.object({
  checkTypes: z.array(checkTypeSchema).optional(),
  documentIds: z.array(z.string().uuid()).optional(),
  reason: z.string().min(3).max(1000),
});
const commercialBody = z.object({
  tier: z.string().min(1),
  overrides: z
    .object({
      paymentMode: z.enum(['PREPAY', 'CREDIT']).optional(),
      creditLimit: z.number().nonnegative().optional(),
      paymentTerms: z.string().optional(),
      markupPct: z.number().nonnegative().optional(),
    })
    .optional(),
});

/**
 * @openapi
 * /applications/{id}/approve:
 *   post: { summary: Approve an application (ADMIN/VERIFIER), tags: [Review], security: [{ bearerAuth: [] }] }
 */
applicationActionsRouter.post(
  '/approve',
  authenticate,
  requireRole('ADMIN', 'VERIFIER'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await review.approveApplication(req.params.id, actorFrom(req.user!));
    res.status(200).json({ ok: true });
  }),
);

/**
 * @openapi
 * /applications/{id}/reject:
 *   post: { summary: Reject an application with a mandatory reason (ADMIN/VERIFIER), tags: [Review], security: [{ bearerAuth: [] }] }
 */
applicationActionsRouter.post(
  '/reject',
  authenticate,
  requireRole('ADMIN', 'VERIFIER'),
  validate({ params: idParam, body: rejectBody }),
  asyncHandler(async (req, res) => {
    await review.rejectApplication(req.params.id, req.body.reason, actorFrom(req.user!));
    res.status(200).json({ ok: true });
  }),
);

/**
 * @openapi
 * /applications/{id}/request-resubmission:
 *   post: { summary: Ask the applicant to re-submit specific checks/documents (ADMIN/VERIFIER), tags: [Review], security: [{ bearerAuth: [] }] }
 */
applicationActionsRouter.post(
  '/request-resubmission',
  authenticate,
  requireRole('ADMIN', 'VERIFIER'),
  validate({ params: idParam, body: resubmitBody }),
  asyncHandler(async (req, res) => {
    await review.requestResubmission(req.params.id, req.body, actorFrom(req.user!));
    res.status(200).json({ ok: true });
  }),
);

/**
 * @openapi
 * /applications/{id}/commercial-config:
 *   post: { summary: Assign/update commercial terms from a tier + overrides (ADMIN), tags: [Commercial], security: [{ bearerAuth: [] }] }
 */
applicationActionsRouter.post(
  '/commercial-config',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: idParam, body: commercialBody }),
  asyncHandler(async (req, res) => {
    const result = await commercial.setCommercialConfig(req.params.id, req.body, actorFrom(req.user!));
    res.status(200).json(result);
  }),
);

/**
 * @openapi
 * /applications/{id}/agreement/send:
 *   post: { summary: Generate the agreement and send it for Digio eSign (ADMIN), tags: [Agreement], security: [{ bearerAuth: [] }] }
 */
applicationActionsRouter.post(
  '/agreement/send',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const result = await agreement.generateAndSendAgreement(req.params.id, actorFrom(req.user!));
    res.status(200).json(result);
  }),
);

/**
 * @openapi
 * /applications/{id}/activate:
 *   post: { summary: Manually activate after a signed agreement (ADMIN fallback), tags: [Agreement], security: [{ bearerAuth: [] }] }
 */
applicationActionsRouter.post(
  '/activate',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const result = await agreement.activateIfSigned(req.params.id, actorFrom(req.user!));
    res.status(200).json(result);
  }),
);
