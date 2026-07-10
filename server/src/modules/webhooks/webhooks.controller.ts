import { z } from 'zod';
import type { Request, Response } from 'express';
import { verifyDigioSignature } from '../../lib/digio';
import { verifyPaymentSignature } from '../../lib/payments';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';
import { processWebhook } from '../verification/verification.service';
import { digioWebhookSchema } from '../verification/verification.schema';

const SIGNATURE_HEADER = 'x-digio-signature';

export async function handleDigioWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.header(SIGNATURE_HEADER);

  // Reject unverified/malformed callbacks with no state change (§11).
  if (!verifyDigioSignature(req.rawBody, signature)) {
    logger.warn('Rejected Digio webhook: invalid signature');
    await recordAuditLogSafe({
      entityType: 'Webhook',
      entityId: 'digio',
      event: 'WEBHOOK_SIGNATURE_REJECTED',
      actorId: null,
      actorRole: 'DIGIO',
    });
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const parsed = digioWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Malformed webhook payload', parsed.error);
  }

  const result = await processWebhook(parsed.data);
  res.status(200).json(result);
}

const paymentWebhookSchema = z.object({
  gatewayRef: z.string().min(1),
  status: z.enum(['SUCCEEDED', 'FAILED']),
});

/**
 * Payment gateway webhook (§11) — signature-validated + idempotent. Confirms a
 * payment's status by gateway ref. In mock mode capture is synchronous so this
 * is mainly the live-gateway async path; the validation + idempotency
 * infrastructure is in place regardless.
 */
export async function handlePaymentWebhook(req: Request, res: Response): Promise<void> {
  if (!verifyPaymentSignature(req.rawBody, req.header('x-payment-signature'))) {
    logger.warn('Rejected payment webhook: invalid signature');
    await recordAuditLogSafe({
      entityType: 'Webhook',
      entityId: 'payment',
      event: 'WEBHOOK_SIGNATURE_REJECTED',
      actorId: null,
      actorRole: 'SYSTEM',
    });
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const parsed = paymentWebhookSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest('Malformed webhook payload', parsed.error);

  const payment = await prisma.payment.findFirst({ where: { gatewayRef: parsed.data.gatewayRef } });
  if (!payment) {
    res.status(200).json({ outcome: 'unknown_ref' });
    return;
  }
  if (payment.status === 'SUCCEEDED' || payment.status === 'FAILED') {
    res.status(200).json({ outcome: 'duplicate' });
    return;
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: parsed.data.status, completedAt: new Date() },
  });
  res.status(200).json({ outcome: 'applied' });
}
