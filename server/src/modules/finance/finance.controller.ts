import type { Request, Response } from 'express';
import type { ActorRole } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import type { AuthUser } from '../../types/express';
import * as financeService from './finance.service';
import * as documentsService from './documents.service';
import { flushOutbox } from './crsOutbox.service';
import { runReconciliation } from './reconciliation.service';
import { runDunning } from './dunning.service';

function agencyId(user: AuthUser): string {
  if (!user.agencyId) throw ApiError.forbidden('Only agency users have finance data');
  return user.agencyId;
}

/** Stream a generated PDF as an inline attachment. */
function sendPdf(res: Response, buffer: Buffer, fileName: string): void {
  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
}

/** Invoice PDF — ADMIN sees any; AGENCY/AGENT scoped to their own agency. */
export async function invoicePdf(req: Request, res: Response): Promise<void> {
  const scope = req.user!.role === 'ADMIN' ? undefined : agencyId(req.user!);
  const { buffer, fileName } = await documentsService.renderInvoicePdf(req.params.id, scope);
  sendPdf(res, buffer, fileName);
}

/** Credit statement PDF for the requesting agency. */
export async function creditStatementPdf(req: Request, res: Response): Promise<void> {
  const { buffer, fileName } = await documentsService.renderCreditStatementPdf(agencyId(req.user!));
  sendPdf(res, buffer, fileName);
}

/** Full account-statement PDF for the requesting agency. */
export async function accountStatementPdf(req: Request, res: Response): Promise<void> {
  const { buffer, fileName } = await documentsService.renderAccountStatementPdf(agencyId(req.user!));
  sendPdf(res, buffer, fileName);
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

/** Admin — invoices across all agencies. */
export async function allInvoices(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  res.status(200).json(await financeService.listAllInvoices(page, pageSize));
}

/** Admin — cancellation refunds + chargebacks across all agencies. */
export async function refunds(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  res.status(200).json(await financeService.listRefunds(page, pageSize));
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

/** Admin — credit agencies with live balances, searchable by name/GSTIN (settlement view). */
export async function settlementAgencies(req: Request, res: Response): Promise<void> {
  const { search } = req.query as { search?: string };
  res.status(200).json({ items: await financeService.listCreditAgencyBalances(search) });
}

/** Admin — record an offline (cash/bank/cheque/UPI) settlement against an agency's credit AR. */
export async function recordSettlement(req: Request, res: Response): Promise<void> {
  res.status(201).json(
    await financeService.recordOfflineSettlement(req.body, {
      actorId: req.user!.id,
      actorRole: req.user!.role as ActorRole,
    }),
  );
}

/** Admin — apply an agency's unapplied advance/credit balance to its open invoices. */
export async function applyAdvance(req: Request, res: Response): Promise<void> {
  res.status(200).json(
    await financeService.applyAgencyAdvance(req.params.id, {
      actorId: req.user!.id,
      actorRole: req.user!.role as ActorRole,
    }),
  );
}

/** Admin — offline settlement/advance receipts for an agency. */
export async function settlementHistory(req: Request, res: Response): Promise<void> {
  res.status(200).json({ items: await financeService.listAgencySettlementHistory(req.params.id) });
}

export async function reconciliation(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await runReconciliation());
}

/** Admin — CRS outbox status (event counts + recent events). */
export async function crsStatus(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await financeService.getCrsStatus());
}

export async function flushCrs(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await flushOutbox());
}

/** v3 §6.3 — run the dunning workflow (overdue reminders, auto-suspend, credit alerts). */
export async function dunning(req: Request, res: Response): Promise<void> {
  const summary = await runDunning({ actorId: req.user!.id, actorRole: req.user!.role as ActorRole });
  res.status(200).json(summary);
}
