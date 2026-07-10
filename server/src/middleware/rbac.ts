import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import type { AuthUser } from '../types/express';

/** Route-level gate: only the listed roles may proceed. Requires `authenticate` to run first. */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(ApiError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

/**
 * Tenant isolation: ADMIN/VERIFIER always pass (cross-tenant is their job).
 * AGENCY/AGENT must have `agencyId` equal to the resource's agencyId, as
 * resolved by `extractAgencyId` from the request (e.g. req.params.agencyId,
 * or a value looked up beforehand).
 */
export function requireOwnAgency(extractAgencyId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (req.user.role === 'ADMIN' || req.user.role === 'VERIFIER') {
      next();
      return;
    }
    const targetAgencyId = extractAgencyId(req);
    if (!req.user.agencyId || !targetAgencyId || req.user.agencyId !== targetAgencyId) {
      next(ApiError.forbidden('You cannot access another agency\'s data'));
      return;
    }
    next();
  };
}

export function requireMfaSatisfied(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(ApiError.unauthorized());
    return;
  }
  if (!req.user.mfaVerified) {
    next(ApiError.forbidden('MFA verification required'));
    return;
  }
  next();
}

/**
 * Defense-in-depth query scoping: merges `{ agencyId: user.agencyId }` into
 * a Prisma `where` clause for AGENCY/AGENT roles so tenant isolation does
 * not depend solely on route guards. No-op passthrough for ADMIN/VERIFIER.
 */
export function scopeToAgency<T extends Record<string, unknown>>(where: T, user: AuthUser): T {
  if (user.role === 'ADMIN' || user.role === 'VERIFIER') {
    return where;
  }
  return { ...where, agencyId: user.agencyId };
}
