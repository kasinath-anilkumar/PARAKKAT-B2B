import type { Request, Response } from 'express';
import { env } from '../../../config/env';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/apiError';
import { recordAuditLog } from '../../audit/audit.service';
import * as mfaService from './mfa.service';

export async function setupTotp(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const result = await mfaService.startTotpSetup(user.id, user.email);
  res.status(200).json(result);
}

export async function confirmTotp(req: Request, res: Response): Promise<void> {
  await mfaService.confirmTotpSetup(req.user!.id, req.body.code);
  res.status(200).json({ mfaEnabled: true, mfaMethod: 'TOTP' });
}

export async function requestEmailSetup(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  await mfaService.requestEmailOtpSetup(user.id, user.email);
  res.status(202).json({ sent: true });
}

export async function confirmEmailSetup(req: Request, res: Response): Promise<void> {
  await mfaService.confirmEmailOtpSetup(req.user!.id, req.body.code);
  res.status(200).json({ mfaEnabled: true, mfaMethod: 'EMAIL' });
}

export async function disableMfa(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (env.MFA_ENFORCED && (user.role === 'ADMIN' || user.role === 'VERIFIER')) {
    throw ApiError.forbidden('MFA is mandatory for this role and cannot be disabled');
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaMethod: 'NONE', mfaSecret: null },
    });
    await recordAuditLog(
      { entityType: 'User', entityId: user.id, event: 'MFA_DISABLED', actorId: user.id, actorRole: user.role },
      tx,
    );
  });
  res.status(200).json({ mfaEnabled: false });
}
