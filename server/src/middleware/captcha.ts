import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { logger } from '../lib/logger';

/**
 * CAPTCHA gate for public onboarding entry points (§11). Disabled by default
 * (dev). When CAPTCHA_ENABLED=true it expects an `x-captcha-token` header and
 * verifies it server-side against the configured provider's siteverify endpoint
 * (Cloudflare Turnstile / hCaptcha / reCAPTCHA — all share the same
 * secret+response contract and return `{ success: boolean }`).
 */
const SITEVERIFY_URLS: Record<typeof env.CAPTCHA_PROVIDER, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  hcaptcha: 'https://hcaptcha.com/siteverify',
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
};

async function verifyCaptchaToken(token: string, remoteIp?: string): Promise<boolean> {
  if (!env.CAPTCHA_SECRET) {
    // Should be unreachable in production (env validation blocks boot), but stay
    // fail-closed rather than accepting unverified tokens.
    logger.error('[captcha] CAPTCHA_ENABLED but CAPTCHA_SECRET is not set; rejecting');
    return false;
  }

  const body = new URLSearchParams({ secret: env.CAPTCHA_SECRET, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URLS[env.CAPTCHA_PROVIDER], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn('[captcha] siteverify returned non-2xx', { status: res.status, provider: env.CAPTCHA_PROVIDER });
      return false;
    }
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      logger.warn('[captcha] verification failed', { provider: env.CAPTCHA_PROVIDER, errors: data['error-codes'] });
    }
    return data.success === true;
  } catch (err) {
    // Network/timeout — fail closed so a broken CAPTCHA service can't be bypassed.
    logger.error('[captcha] siteverify request failed', { err: (err as Error).message, provider: env.CAPTCHA_PROVIDER });
    return false;
  }
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
  verifyCaptchaToken(token, req.ip)
    .then((ok) => next(ok ? undefined : ApiError.badRequest('CAPTCHA verification failed')))
    .catch(next);
}
