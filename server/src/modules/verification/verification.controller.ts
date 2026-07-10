import type { Request, Response } from 'express';
import type { VerificationCheckType, VerificationStatus } from '@prisma/client';
import * as verificationService from './verification.service';

export async function initiate(req: Request, res: Response): Promise<void> {
  await verificationService.initiateChecksForApplication(req.params.id);
  res.status(202).json({ initiated: true });
}

export async function override(req: Request, res: Response): Promise<void> {
  await verificationService.overrideVerification(
    req.params.id,
    req.params.checkType as VerificationCheckType,
    req.body.status as VerificationStatus,
    { actorId: req.user!.id, actorRole: req.user!.role },
  );
  res.status(200).json({ updated: true });
}
