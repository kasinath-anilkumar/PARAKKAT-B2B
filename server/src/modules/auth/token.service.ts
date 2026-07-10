import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { generateRandomToken, sha256Hex } from '../../utils/crypto';
import { ApiError } from '../../utils/apiError';
import { recordAuditLog } from '../audit/audit.service';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  agencyId: string | null;
  mfaVerified: boolean;
  type: 'access';
}

export interface MfaPendingTokenPayload {
  sub: string;
  type: 'mfa_pending';
}

export interface RefreshTokenMeta {
  userAgent?: string;
  ip?: string;
}

const REFRESH_TOKEN_TTL_MS = () => env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export function issueAccessToken(user: {
  id: string;
  role: Role;
  agencyId: string | null;
  mfaVerified: boolean;
}): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    agencyId: user.agencyId,
    mfaVerified: user.mfaVerified,
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (decoded.type !== 'access') {
    throw new ApiError(401, 'Invalid token type');
  }
  return decoded;
}

/** Issued after password check when MFA is required but not yet satisfied for this session. */
export function issueMfaPendingToken(userId: string): string {
  const payload: MfaPendingTokenPayload = { sub: userId, type: 'mfa_pending' };
  return jwt.sign(payload, env.JWT_MFA_SECRET, {
    expiresIn: env.MFA_PENDING_TOKEN_TTL as SignOptions['expiresIn'],
  });
}

export function verifyMfaPendingToken(token: string): MfaPendingTokenPayload {
  const decoded = jwt.verify(token, env.JWT_MFA_SECRET) as MfaPendingTokenPayload;
  if (decoded.type !== 'mfa_pending') {
    throw new ApiError(401, 'Invalid token type');
  }
  return decoded;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export async function issueRefreshToken(
  userId: string,
  meta: RefreshTokenMeta = {},
): Promise<IssuedRefreshToken> {
  const token = generateRandomToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS());

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    },
  });

  return { token, expiresAt };
}

export interface RotateResult {
  userId: string;
  refresh: IssuedRefreshToken;
}

/**
 * Verifies + rotates a refresh token. If the presented token has already
 * been revoked (i.e. it was used before, or explicitly revoked), this is
 * treated as possible theft: every refresh token for that user is revoked
 * and an audit event is recorded, then the call fails.
 */
export async function rotateRefreshToken(
  rawToken: string,
  meta: RefreshTokenMeta = {},
): Promise<RotateResult> {
  const tokenHash = sha256Hex(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  if (existing.revokedAt || existing.expiresAt < new Date()) {
    if (existing.revokedAt) {
      await prisma.$transaction(async (tx) => {
        await tx.refreshToken.updateMany({
          where: { userId: existing.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await recordAuditLog(
          {
            entityType: 'User',
            entityId: existing.userId,
            event: 'TOKEN_REUSE_DETECTED',
            actorId: existing.userId,
            actorRole: 'SYSTEM',
          },
          tx,
        );
      });
    }
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  const refresh = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    const token = generateRandomToken();
    const newTokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS());
    await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: newTokenHash,
        expiresAt,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    return { token, expiresAt };
  });

  return { userId: existing.userId, refresh };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = sha256Hex(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
