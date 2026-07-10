import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError';
import { loadByResumeToken } from '../modules/onboarding/onboarding.service';

const HEADER = 'x-resume-token';

/**
 * Authorizes a public applicant to act on their own draft. Reads the
 * application id from `:id` and the resume token from the `x-resume-token`
 * header, verifies it, and attaches the loaded application to `req.application`.
 * This is the onboarding equivalent of `authenticate` for users who have no
 * account yet.
 */
export function requireResumeToken(req: Request, _res: Response, next: NextFunction): void {
  const token = req.header(HEADER);
  const applicationId = req.params.id;
  if (!token) {
    next(ApiError.unauthorized('Missing resume token'));
    return;
  }
  loadByResumeToken(applicationId, token)
    .then((application) => {
      req.application = application;
      next();
    })
    .catch(next);
}
