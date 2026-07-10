import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError';
import { prisma } from '../lib/prisma';
import { verifyAccessToken, verifyMfaPendingToken } from '../modules/auth/token.service';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing bearer token'));
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      agencyId: payload.agencyId,
      mfaVerified: payload.mfaVerified,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/**
 * Accepts either a normal access token, or an MFA-pending token issued at
 * login when a role mandates MFA but the user hasn't enabled it yet. Only
 * for the MFA *setup* routes — a pending token can never satisfy
 * `requireMfaSatisfied` or any route requiring a fully-verified session,
 * since req.user.mfaVerified is hard-set to false in the pending-token path.
 */
export async function authenticateOrMfaPending(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing bearer token'));
    return;
  }
  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      agencyId: payload.agencyId,
      mfaVerified: payload.mfaVerified,
    };
    next();
    return;
  } catch {
    // fall through to try as an mfa-pending token
  }

  try {
    const payload = verifyMfaPendingToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      next(ApiError.unauthorized('Invalid or expired token'));
      return;
    }
    req.user = { id: user.id, role: user.role, agencyId: user.agencyId, mfaVerified: false };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}
