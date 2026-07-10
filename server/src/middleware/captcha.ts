import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { logger } from '../lib/logger';

/**
 * Optional CAPTCHA gate for public onboarding entry points (§11). Disabled by
 * default (dev). When CAPTCHA_ENABLED=true it expects an `x-captcha-token`
 * header. Live provider verification (hCaptcha/reCAPTCHA/Turnstile) is a
 * Phase 8 hardening task — this is the seam plus a presence check so the
 * contract is in place; wire the real verify call in `verifyCaptchaToken`.
 */
async function verifyCaptchaToken(token: string): Promise<boolean> {
  if (!env.CAPTCHA_SECRET) {
    logger.warn('[captcha] CAPTCHA_ENABLED but CAPTCHA_SECRET is not set; accepting token presence only');
    return token.length > 0;
  }
  // TODO(phase-8): call the CAPTCHA provider's siteverify endpoint here.
  return token.length > 0;
}

export function captchaGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!env.CAPTCHA_ENABLED) {
    next();
    return;
  }
  const token = req.header('x-captcha-token');
  if (!token) {
    next(ApiError.badRequest('CAPTCHA verification required'));
    return;
  }
  verifyCaptchaToken(token)
    .then((ok) => next(ok ? undefined : ApiError.badRequest('CAPTCHA verification failed')))
    .catch(next);
}
