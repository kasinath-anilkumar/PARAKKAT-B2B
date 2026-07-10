import crypto from 'node:crypto';
import type { Booking, Invoice, Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { getPaymentGateway } from '../../lib/payments';
import { broadcast } from '../../lib/realtime';
import { logger } from '../../lib/logger';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';
import { computeCancellation } from './cancellation';
import { enqueueCrsEvent, flushOutbox } from './crsOutbox.service';

function invoiceNumber(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `INV-${ym}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function parseNetDays(terms: string): number {
  const m = /(\d+)/.exec(terms);
  return m ? Number(m[1]) : 15;
}

/** Deliver outbox events immediately in dev (in addition to the worker). */
async function flushInline(): Promise<void> {
  if (!env.CRS_FLUSH_INLINE) return;
  try {
    await flushOutbox();
  } catch (err) {
    logger.error('Inline CRS flush failed (worker will retry)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Balance owed on credit: unpaid CREDIT invoices. This feeds the credit gate. */
export async function getOutstanding(agencyId: string): Promise<number> {
  const agg = await prisma.invoice.aggregate({
    where: { agencyId, paymentMode: 'CREDIT', status: 'ISSUED' },
    _sum: { amount: true },
  });
  return agg._sum.amount ? Number(agg._sum.amount) : 0;
}

/**
 * Records a credit booking's obligation: an ISSUED credit invoice (due per the
 * agency's payment terms) plus a CRS BOOKING_OBLIGATION event, atomically.
 */
export async function recordBookingObligation(booking: Booking, paymentTerms: string): Promise<Invoice> {
  const dueDate = new Date(Date.now() + parseNetDays(paymentTerms) * 24 * 60 * 60 * 1000);
  const amount = Number(booking.agencyPrice);
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        number: invoiceNumber(),
        agencyId: booking.agencyId,
        bookingId: booking.id,
        correlationId: booking.correlationId,
        amount: booking.agencyPrice,
        paymentMode: 'CREDIT',
        status: 'ISSUED',
        dueDate,
      },
    });
    await enqueueCrsEvent(tx, {
      eventType: 'BOOKING_OBLIGATION',
      correlationId: booking.correlationId,
      payload: { bookingId: booking.id, agencyId: booking.agencyId, amount, paymentMode: 'CREDIT' },
    });
    return inv;
  });
  await recordAuditLogSafe({
    entityType: 'Invoice',
    entityId: invoice.id,
    event: 'INVOICE_ISSUED',
    actorId: null,
    actorRole: 'SYSTEM',
    after: { number: invoice.number, amount, paymentMode: 'CREDIT' },
  });
  await flushInline();
  return invoice;
}

/**
 * Collects payment for a pay-first booking: captures via the gateway, then
 * atomically records a SUCCEEDED payment, a PAID invoice, and a CRS PAYMENT
 * event. Throws (leaving the booking unpaid) if capture fails.
 */
export async function collectPaymentForBooking(booking: Booking): Promise<Invoice> {
  const amount = Number(booking.agencyPrice);
  const capture = await getPaymentGateway().capture({
    correlationId: booking.correlationId,
    amount,
    agencyId: booking.agencyId,
  });
  if (capture.status !== 'SUCCEEDED') {
    throw ApiError.badRequest('Payment was not completed');
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        number: invoiceNumber(),
        agencyId: booking.agencyId,
        bookingId: booking.id,
        correlationId: booking.correlationId,
        amount: booking.agencyPrice,
        paymentMode: 'PREPAY',
        status: 'PAID',
        paidAt: new Date(),
      },
    });
    await tx.payment.create({
      data: {
        agencyId: booking.agencyId,
        bookingId: booking.id,
        invoiceId: inv.id,
        correlationId: booking.correlationId,
        amount: booking.agencyPrice,
        direction: 'INBOUND',
        status: 'SUCCEEDED',
        gatewayRef: capture.gatewayRef,
        completedAt: new Date(),
      },
    });
    await enqueueCrsEvent(tx, {
      eventType: 'PAYMENT',
      correlationId: booking.correlationId,
      payload: { bookingId: booking.id, agencyId: booking.agencyId, amount, gatewayRef: capture.gatewayRef },
    });
    return inv;
  });
  await recordAuditLogSafe({
    entityType: 'Invoice',
    entityId: invoice.id,
    event: 'PAYMENT_COLLECTED',
    actorId: null,
    actorRole: 'SYSTEM',
    after: { number: invoice.number, amount, gatewayRef: capture.gatewayRef },
  });
  await flushInline();
  return invoice;
}

/**
 * Applies the cancellation policy to a booking on cancel: computes the charge +
 * refund, adjusts the invoice/AR, refunds any paid amount via the gateway, and
 * posts CRS CANCELLATION_CHARGE (+ REFUND) events.
 */
export async function applyCancellation(booking: Booking, cancelledAt: Date): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { bookingId: booking.id } });
  const outcome = computeCancellation(Number(booking.agencyPrice), booking.checkIn, cancelledAt);

  // Refund cash only for a paid (prepay) invoice.
  let refundRef: string | undefined;
  if (invoice && invoice.status === 'PAID' && outcome.refundAmount > 0) {
    const payment = await prisma.payment.findFirst({
      where: { bookingId: booking.id, direction: 'INBOUND', status: 'SUCCEEDED' },
    });
    if (payment?.gatewayRef) {
      const r = await getPaymentGateway().refund(payment.gatewayRef, outcome.refundAmount);
      refundRef = r.refundRef;
    }
  }

  await prisma.$transaction(async (tx) => {
    if (invoice) {
      if (invoice.status === 'PAID') {
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'REFUNDED' } });
        if (refundRef) {
          await tx.payment.create({
            data: {
              agencyId: booking.agencyId,
              bookingId: booking.id,
              invoiceId: invoice.id,
              correlationId: booking.correlationId,
              amount: outcome.refundAmount,
              direction: 'OUTBOUND',
              status: 'SUCCEEDED',
              gatewayRef: refundRef,
              completedAt: new Date(),
            },
          });
        }
      } else if (invoice.status === 'ISSUED') {
        // Credit booking: agency now owes only the cancellation charge.
        if (outcome.chargeAmount > 0) {
          await tx.invoice.update({ where: { id: invoice.id }, data: { amount: outcome.chargeAmount } });
        } else {
          await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'VOID' } });
        }
      }
    }

    if (outcome.chargeAmount > 0) {
      await enqueueCrsEvent(tx, {
        eventType: 'CANCELLATION_CHARGE',
        correlationId: booking.correlationId,
        payload: { bookingId: booking.id, agencyId: booking.agencyId, chargeAmount: outcome.chargeAmount, chargePct: outcome.chargePct },
      });
    }
    if (outcome.refundAmount > 0 && invoice?.status === 'PAID') {
      await enqueueCrsEvent(tx, {
        eventType: 'REFUND',
        correlationId: booking.correlationId,
        payload: { bookingId: booking.id, agencyId: booking.agencyId, refundAmount: outcome.refundAmount, refundRef: refundRef ?? null },
      });
    }
  });

  await recordAuditLogSafe({
    entityType: 'Booking',
    entityId: booking.id,
    event: 'CANCELLATION_SETTLED',
    actorId: null,
    actorRole: 'SYSTEM',
    after: { ...outcome },
  });
  await flushInline();
}

/** Agency settles an outstanding credit invoice (pays it down via the gateway). */
export async function settleInvoice(invoiceId: string, agencyId: string): Promise<Invoice> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.agencyId !== agencyId) throw ApiError.notFound('Invoice not found');
  if (invoice.status !== 'ISSUED') throw ApiError.conflict('Invoice is not payable');

  const amount = Number(invoice.amount);
  const capture = await getPaymentGateway().capture({ correlationId: invoice.correlationId, amount, agencyId });
  if (capture.status !== 'SUCCEEDED') throw ApiError.badRequest('Payment was not completed');

  const paid = await prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await tx.payment.create({
      data: {
        agencyId,
        bookingId: invoice.bookingId,
        invoiceId: invoice.id,
        correlationId: invoice.correlationId,
        amount: invoice.amount,
        direction: 'INBOUND',
        status: 'SUCCEEDED',
        gatewayRef: capture.gatewayRef,
        completedAt: new Date(),
      },
    });
    await enqueueCrsEvent(tx, {
      eventType: 'PAYMENT',
      correlationId: invoice.correlationId,
      payload: { invoiceId: invoice.id, agencyId, amount, gatewayRef: capture.gatewayRef, settlement: true },
    });
    return updated;
  });
  await recordAuditLogSafe({
    entityType: 'Invoice',
    entityId: invoice.id,
    event: 'INVOICE_SETTLED',
    actorId: null,
    actorRole: 'SYSTEM',
    after: { number: invoice.number, amount },
  });
  await flushInline();
  broadcast(['finance'], { agencyId });
  return paid;
}

export interface AgencyBalance {
  outstanding: number;
  creditLimit: number;
  available: number;
}

export async function getAgencyBalance(agencyId: string): Promise<AgencyBalance> {
  const [outstanding, config] = await Promise.all([
    getOutstanding(agencyId),
    prisma.commercialConfiguration.findFirst({ where: { agencyId, isCurrent: true } }),
  ]);
  const creditLimit = config ? Number(config.creditLimit) : 0;
  return { outstanding, creditLimit, available: Math.max(0, creditLimit - outstanding) };
}

export async function listInvoices(agencyId: string, page: number, pageSize: number) {
  const where: Prisma.InvoiceWhereInput = { agencyId };
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({ where, orderBy: { issuedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.invoice.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
