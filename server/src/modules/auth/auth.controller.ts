import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import * as authService from './auth.service';

const REFRESH_COOKIE_NAME = 'refreshToken';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function requestMeta(req: Request) {
  return { userAgent: req.header('user-agent'), ip: req.ip };
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body.email, req.body.password, requestMeta(req));

  if (result.status === 'ok') {
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    res.status(200).json({ user: result.user, accessToken: result.accessToken });
    return;
  }

  if (result.status === 'mfa_setup_required') {
    res.status(200).json({
      mfaSetupRequired: true,
      mfaPendingToken: result.mfaPendingToken,
    });
    return;
  }

  res.status(200).json({
    mfaRequired: true,
    mfaMethod: result.mfaMethod,
    mfaPendingToken: result.mfaPendingToken,
  });
}

export async function verifyMfa(req: Request, res: Response): Promise<void> {
  const result = await authService.verifyMfaAndLogin(
    req.body.mfaPendingToken,
    req.body.code,
    requestMeta(req),
  );
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({ user: result.user, accessToken: result.accessToken });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    throw ApiError.unauthorized('No refresh token provided');
  }
  const result = await authService.refreshSession(rawToken, requestMeta(req));
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({ accessToken: result.accessToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (rawToken) {
    await authService.logout(rawToken);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.status(204).send();
}

/** v3 §10.2 — authenticated self-service password change. */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const result = await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword,
    requestMeta(req),
  );
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
  res.status(200).json({ user: result.user, accessToken: result.accessToken });
}
