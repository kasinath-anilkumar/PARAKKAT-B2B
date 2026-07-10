import type { Role, User } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';
import { verifyPassword } from './password.service';
import {
  type RefreshTokenMeta,
  issueAccessToken,
  issueMfaPendingToken,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyMfaPendingToken,
} from './token.service';
import { sendLoginEmailOtp, verifyEmailLoginCode, verifyTotpLoginCode } from './mfa/mfa.service';

/**
 * ADMIN/VERIFIER must have MFA (unless MFA_ENFORCED is disabled for dev);
 * AGENCY/AGENT follow their own mfaEnabled flag.
 */
export function isMfaRequiredForRole(role: Role, mfaEnabled: boolean): boolean {
  if (env.MFA_ENFORCED && (role === 'ADMIN' || role === 'VERIFIER')) return true;
  return mfaEnabled;
}

interface SafeUser {
  id: string;
  email: string;
  role: Role;
  agencyId: string | null;
  mfaEnabled: boolean;
  mfaMethod: 'NONE' | 'TOTP' | 'EMAIL';
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    agencyId: user.agencyId,
    mfaEnabled: user.mfaEnabled,
    mfaMethod: user.mfaMethod,
  };
}

export type LoginResult =
  | { status: 'ok'; user: SafeUser; accessToken: string; refreshToken: string }
  | { status: 'mfa_required'; mfaMethod: 'TOTP' | 'EMAIL'; mfaPendingToken: string }
  | { status: 'mfa_setup_required'; mfaPendingToken: string };

export async function login(
  email: string,
  password: string,
  meta: RefreshTokenMeta,
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    await recordAuditLogSafe({
      entityType: 'User',
      entityId: user.id,
      event: 'LOGIN_FAILED',
      actorId: user.id,
      actorRole: user.role,
    });
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.status === 'SUSPENDED') {
    await recordAuditLogSafe({
      entityType: 'User',
      entityId: user.id,
      event: 'LOGIN_BLOCKED_SUSPENDED',
      actorId: user.id,
      actorRole: user.role,
    });
    throw ApiError.forbidden('This account has been suspended');
  }

  const mfaRequired = isMfaRequiredForRole(user.role, user.mfaEnabled);

  if (mfaRequired && !user.mfaEnabled) {
    await recordAuditLogSafe({
      entityType: 'User',
      entityId: user.id,
      event: 'LOGIN_MFA_SETUP_REQUIRED',
      actorId: user.id,
      actorRole: user.role,
    });
    return { status: 'mfa_setup_required', mfaPendingToken: issueMfaPendingToken(user.id) };
  }

  if (mfaRequired && user.mfaEnabled) {
    if (user.mfaMethod === 'EMAIL') {
      await sendLoginEmailOtp(user.id, user.email);
    }
    await recordAuditLogSafe({
      entityType: 'User',
      entityId: user.id,
      event: 'LOGIN_MFA_PENDING',
      actorId: user.id,
      actorRole: user.role,
    });
    return {
      status: 'mfa_required',
      mfaMethod: user.mfaMethod as 'TOTP' | 'EMAIL',
      mfaPendingToken: issueMfaPendingToken(user.id),
    };
  }

  const accessToken = issueAccessToken({
    id: user.id,
    role: user.role,
    agencyId: user.agencyId,
    mfaVerified: true,
  });
  const { token: refreshToken } = await issueRefreshToken(user.id, meta);

  await recordAuditLogSafe({
    entityType: 'User',
    entityId: user.id,
    event: 'LOGIN_SUCCESS',
    actorId: user.id,
    actorRole: user.role,
  });

  return { status: 'ok', user: toSafeUser(user), accessToken, refreshToken };
}

export interface MfaVerifyResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

export async function verifyMfaAndLogin(
  mfaPendingToken: string,
  code: string,
  meta: RefreshTokenMeta,
): Promise<MfaVerifyResult> {
  let userId: string;
  try {
    userId = verifyMfaPendingToken(mfaPendingToken).sub;
  } catch {
    throw ApiError.unauthorized('MFA session expired, please log in again');
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid =
    user.mfaMethod === 'TOTP'
      ? await verifyTotpLoginCode(user.id, code)
      : await verifyEmailLoginCode(user.id, code);

  if (!valid) {
    await recordAuditLogSafe({
      entityType: 'User',
      entityId: user.id,
      event: 'LOGIN_MFA_FAILED',
      actorId: user.id,
      actorRole: user.role,
    });
    throw ApiError.unauthorized('Invalid or expired code');
  }

  const accessToken = issueAccessToken({
    id: user.id,
    role: user.role,
    agencyId: user.agencyId,
    mfaVerified: true,
  });
  const { token: refreshToken } = await issueRefreshToken(user.id, meta);

  await recordAuditLogSafe({
    entityType: 'User',
    entityId: user.id,
    event: 'LOGIN_SUCCESS_MFA',
    actorId: user.id,
    actorRole: user.role,
  });

  return { user: toSafeUser(user), accessToken, refreshToken };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function refreshSession(
  rawRefreshToken: string,
  meta: RefreshTokenMeta,
): Promise<RefreshResult> {
  const { userId, refresh } = await rotateRefreshToken(rawRefreshToken, meta);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const accessToken = issueAccessToken({
    id: user.id,
    role: user.role,
    agencyId: user.agencyId,
    mfaVerified: true,
  });
  return { accessToken, refreshToken: refresh.token };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  await revokeRefreshToken(rawRefreshToken);
}
