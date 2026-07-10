import type { Request, Response } from 'express';
import type { ActorRole } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import type { AuthUser } from '../../types/express';
import * as financeService from './finance.service';
import { flushOutbox } from './crsOutbox.service';
import { runReconciliation } from './reconciliation.service';
import { runDunning } from './dunning.service';

function agencyId(user: AuthUser): string {
  if (!user.agencyId) throw ApiError.forbidden('Only agency users have finance data');
  return user.agencyId;
}

export async function balance(req: Request, res: Response): Promise<void> {
  res.status(200).json(await financeService.getAgencyBalance(agencyId(req.user!)));
}

export async function invoices(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  res.status(200).json(await financeService.listInvoices(agencyId(req.user!), page, pageSize));
}

export async function settle(req: Request, res: Response): Promise<void> {
  const { amount } = (req.body ?? {}) as { amount?: number };
  res.status(200).json(await financeService.settleInvoice(req.params.id, agencyId(req.user!), amount));
}

/** Admin — list recent inbound payments with settlement/chargeback state (v3 §5.3). */
export async function payments(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  res.status(200).json(await financeService.listPayments(page, pageSize));
}

/** Admin — record a chargeback against a settled inbound payment (v3 §5.3). */
export async function chargeback(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason: string };
  res.status(200).json(
    await financeService.recordChargeback(req.params.id, reason, {
      actorId: req.user!.id,
      actorRole: req.user!.role as ActorRole,
    }),
  );
}

export async function reconciliation(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await runReconciliation());
}

export async function flushCrs(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await flushOutbox());
}

/** v3 §6.3 — run the dunning workflow (overdue reminders, auto-suspend, credit alerts). */
export async function dunning(req: Request, res: Response): Promise<void> {
  const summary = await runDunning({ actorId: req.user!.id, actorRole: req.user!.role as ActorRole });
  res.status(200).json(summary);
}
