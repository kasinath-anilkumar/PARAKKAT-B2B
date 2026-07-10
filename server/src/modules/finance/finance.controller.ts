import type { Request, Response } from 'express';
import { ApiError } from '../../utils/apiError';
import type { AuthUser } from '../../types/express';
import * as financeService from './finance.service';
import { flushOutbox } from './crsOutbox.service';
import { runReconciliation } from './reconciliation.service';

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
  res.status(200).json(await financeService.settleInvoice(req.params.id, agencyId(req.user!)));
}

export async function reconciliation(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await runReconciliation());
}

export async function flushCrs(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await flushOutbox());
}
