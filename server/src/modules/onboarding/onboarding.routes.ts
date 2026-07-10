import { Router } from 'express';
import { captchaGuard } from '../../middleware/captcha';
import {
  onboardingActionLimiter,
  onboardingCreateLimiter,
} from '../../middleware/rateLimit';
import { requireResumeToken } from '../../middleware/resumeToken';
import { uploadSingleFile } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as documentsController from '../documents/documents.controller';
import * as onboardingController from './onboarding.controller';
import { applicationIdParamSchema, draftInputSchema } from './onboarding.schema';

export const onboardingRouter = Router();

/**
 * @openapi
 * /onboarding/applications:
 *   post:
 *     summary: Create a resumable draft application (public). Returns a resume token.
 *     tags: [Onboarding]
 */
onboardingRouter.post(
  '/applications',
  onboardingCreateLimiter,
  captchaGuard,
  validate({ body: draftInputSchema }),
  asyncHandler(onboardingController.createDraft),
);

/**
 * @openapi
 * /onboarding/applications/{id}:
 *   get:
 *     summary: Resume a draft (requires x-resume-token header)
 *     tags: [Onboarding]
 */
onboardingRouter.get(
  '/applications/:id',
  onboardingActionLimiter,
  validate({ params: applicationIdParamSchema }),
  requireResumeToken,
  asyncHandler(onboardingController.getDraft),
);

/**
 * @openapi
 * /onboarding/applications/{id}:
 *   patch:
 *     summary: Update a draft (requires x-resume-token header)
 *     tags: [Onboarding]
 */
onboardingRouter.patch(
  '/applications/:id',
  onboardingActionLimiter,
  validate({ params: applicationIdParamSchema, body: draftInputSchema }),
  requireResumeToken,
  asyncHandler(onboardingController.updateDraft),
);

/**
 * @openapi
 * /onboarding/applications/{id}/submit:
 *   post:
 *     summary: Submit a completed draft — moves it Draft → Verification
 *     tags: [Onboarding]
 */
onboardingRouter.post(
  '/applications/:id/submit',
  onboardingActionLimiter,
  validate({ params: applicationIdParamSchema }),
  requireResumeToken,
  asyncHandler(onboardingController.submitApplication),
);

/**
 * @openapi
 * /onboarding/applications/{id}/documents:
 *   post:
 *     summary: Upload a proof document to a draft (multipart, field "file")
 *     tags: [Onboarding]
 */
onboardingRouter.post(
  '/applications/:id/documents',
  onboardingActionLimiter,
  validate({ params: applicationIdParamSchema }),
  requireResumeToken,
  uploadSingleFile,
  asyncHandler(documentsController.upload),
);

/**
 * @openapi
 * /onboarding/applications/{id}/documents:
 *   get:
 *     summary: List documents uploaded to a draft
 *     tags: [Onboarding]
 */
onboardingRouter.get(
  '/applications/:id/documents',
  onboardingActionLimiter,
  validate({ params: applicationIdParamSchema }),
  requireResumeToken,
  asyncHandler(documentsController.list),
);

/**
 * @openapi
 * /onboarding/applications/{id}/documents/{docId}/url:
 *   get:
 *     summary: Get a short-lived signed URL for a document
 *     tags: [Onboarding]
 */
onboardingRouter.get(
  '/applications/:id/documents/:docId/url',
  onboardingActionLimiter,
  validate({ params: applicationIdParamSchema }),
  requireResumeToken,
  asyncHandler(documentsController.signedUrl),
);
