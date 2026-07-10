import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../../../lib/prisma';
import { getMailer } from '../../../lib/mailer';
import { ApiError } from '../../../utils/apiError';
import {
  decryptSecret,
  encryptSecret,
  generateNumericOtp,
  sha256Hex,
  timingSafeEqual,
} from '../../../utils/crypto';
import { recordAuditLog } from '../../audit/audit.service';

const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const ISSUER = 'B2B Resort Booking Portal';

export interface TotpSetupResult {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  // The base32 secret, so users whose app can't scan the QR (or who want to
  // generate codes another way) can enter it manually. Same secret encoded in
  // the QR — standard "manual entry key" affordance.
  manualEntryKey: string;
}

/** Step 1 of TOTP setup: generate + store (pending) secret, return QR for the authenticator app. */
export async function startTotpSetup(userId: string, email: string): Promise<TotpSetupResult> {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: encryptSecret(secret) },
  });

  return { otpauthUrl, qrCodeDataUrl, manualEntryKey: secret };
}

/** Step 2 of TOTP setup: confirm the user's authenticator app produces valid codes. */
export async function confirmTotpSetup(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.mfaSecret) {
    throw ApiError.badRequest('No TOTP setup in progress for this user');
  }
  const secret = decryptSecret(user.mfaSecret);
  const valid = authenticator.verify({ token: code, secret });
  if (!valid) {
    throw ApiError.badRequest('Invalid TOTP code');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaMethod: 'TOTP' },
    });
    await recordAuditLog(
      { entityType: 'User', entityId: userId, event: 'MFA_ENABLED', actorId: userId, actorRole: user.role },
      tx,
    );
  });
}

/** Verifies a TOTP code against the user's already-confirmed secret (used at login). */
export async function verifyTotpLoginCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.mfaSecret) return false;
  const secret = decryptSecret(user.mfaSecret);
  return authenticator.verify({ token: code, secret });
}

async function createOtpCode(
  userId: string,
  purpose: 'MFA_LOGIN' | 'MFA_SETUP',
): Promise<string> {
  const code = generateNumericOtp(6);
  await prisma.otpCode.create({
    data: {
      userId,
      channel: 'EMAIL',
      purpose,
      codeHash: sha256Hex(code),
      expiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
    },
  });
  return code;
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  await getMailer().send({
    to: email,
    subject: 'Your verification code',
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });
}

export async function requestEmailOtpSetup(userId: string, email: string): Promise<void> {
  const code = await createOtpCode(userId, 'MFA_SETUP');
  await sendOtpEmail(email, code);
}

export async function confirmEmailOtpSetup(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await consumeOtpCode(userId, 'MFA_SETUP', code);
  if (!valid) {
    throw ApiError.badRequest('Invalid or expired code');
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaMethod: 'EMAIL' },
    });
    await recordAuditLog(
      { entityType: 'User', entityId: userId, event: 'MFA_ENABLED', actorId: userId, actorRole: user.role },
      tx,
    );
  });
}

export async function sendLoginEmailOtp(userId: string, email: string): Promise<void> {
  const code = await createOtpCode(userId, 'MFA_LOGIN');
  await sendOtpEmail(email, code);
}

export async function verifyEmailLoginCode(userId: string, code: string): Promise<boolean> {
  return consumeOtpCode(userId, 'MFA_LOGIN', code);
}

/** Finds the most recent unconsumed, unexpired OTP for the purpose and marks it consumed on match. */
async function consumeOtpCode(
  userId: string,
  purpose: 'MFA_LOGIN' | 'MFA_SETUP',
  code: string,
): Promise<boolean> {
  const candidate = await prisma.otpCode.findFirst({
    where: { userId, purpose, channel: 'EMAIL', consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!candidate) return false;
  if (!timingSafeEqual(sha256Hex(code), candidate.codeHash)) return false;

  await prisma.otpCode.update({
    where: { id: candidate.id },
    data: { consumedAt: new Date() },
  });
  return true;
}
