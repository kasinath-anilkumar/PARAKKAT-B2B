import crypto from 'node:crypto';
import type { ActorRole, Booking, Invoice, Payment, Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { getPaymentGateway } from '../../lib/payments';
import { broadcast } from '../../lib/realtime';
import { logger } from '../../lib/logger';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';
import { notify } from '../notifications/notification.service';
import { computeCancellation } from './cancellation';
import { computeGst, generateIrn } from './gst';
import { enqueueCrsEvent, flushOutbox } from './crsOutbox.service';

function invoiceNumber(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `INV-${ym}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function creditNoteNumber(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `CN-${ym}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** GST tax fields for a booking's invoice (v3 §6.1). Recipient = agency GSTIN. */
async function gstFieldsFor(booking: Booking) {
  const agency = await prisma.agency.findUnique({ where: { id: booking.agencyId }, select: { gstin: true } });
  const g = computeGst({
    taxableValue: Number(booking.agencyPrice),
    nights: booking.nights,
    resortId: booking.resortId,
    recipientGstin: agency?.gstin,
  });
  return {
    gstRate: g.gstRate,
    sac: g.sac,
    placeOfSupply: g.placeOfSupply,
    supplierGstin: g.supplierGstin,
    recipientGstin: g.recipientGstin,
    cgst: g.cgst,
    sgst: g.sgst,
    igst: g.igst,
    invoiceTotal: g.invoiceTotal,
    irn: generateIrn(`${booking.correlationId}:invoice`),
  };
}

/** GST split for a credit note, mirroring the original invoice's rate & place-of-supply. */
function creditNoteGst(invoice: Invoice, reductionTaxable: number) {
  const rate = invoice.gstRate;
  const inter = Number(invoice.igst) > 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (rate > 0) {
    const tax = round2((reductionTaxable * rate) / 100);
    if (inter) igst = tax;
    else {
      cgst = round2(tax / 2);
      sgst = round2(tax - cgst);
    }
  }
  return { gstRate: rate, cgst, sgst, igst, total: round2(reductionTaxable + cgst + sgst + igst) };
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

/**
 * Balance owed on credit: unsettled CREDIT invoices, net of any partial payments
 * (v3 §5.3). AR = Σ(amount − amountPaid) over ISSUED/PARTIALLY_PAID credit invoices.
 * This feeds the credit gate.
 */
export async function getOutstanding(agencyId: string): Promise<number> {
  const agg = await prisma.invoice.aggregate({
    where: { agencyId, paymentMode: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
    _sum: { amount: true, amountPaid: true },
  });
  const billed = agg._sum.amount ? Number(agg._sum.amount) : 0;
  const paid = agg._sum.amountPaid ? Number(agg._sum.amountPaid) : 0;
  return round2(Math.max(0, billed - paid));
}

/**
 * Records a credit booking's obligation: an ISSUED credit invoice (due per the
 * agency's payment terms) plus a CRS BOOKING_OBLIGATION event, atomically.
 */
export async function recordBookingObligation(booking: Booking, paymentTerms: string): Promise<Invoice> {
  const dueDate = new Date(Date.now() + parseNetDays(paymentTerms) * 24 * 60 * 60 * 1000);
  const amount = Number(booking.agencyPrice);
  const gst = await gstFieldsFor(booking);
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
        ...gst,
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

  const gst = await gstFieldsFor(booking);
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
        ...gst,
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
export async function applyCancellation(
  booking: Booking,
  cancelledAt: Date,
  override?: { chargePct: number },
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { bookingId: booking.id } });
  const price = Number(booking.agencyPrice);
  // Resort-initiated changes (§7.3) force a full refund; otherwise apply the D4 bands.
  const outcome = override
    ? { chargePct: override.chargePct, chargeAmount: round2((price * override.chargePct) / 100), refundAmount: round2(price - round2((price * override.chargePct) / 100)) }
    : computeCancellation(price, booking.checkIn, cancelledAt);

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

      // v3 §6.4 — issue a GST credit note for the reduced/refunded portion.
      if (outcome.refundAmount > 0) {
        const cn = creditNoteGst(invoice, outcome.refundAmount);
        await tx.creditNote.create({
          data: {
            number: creditNoteNumber(),
            invoiceId: invoice.id,
            agencyId: booking.agencyId,
            correlationId: booking.correlationId,
            reason: `Cancellation — ${outcome.chargePct}% charge applied`,
            taxableValue: outcome.refundAmount,
            ...cn,
            irn: generateIrn(`${booking.correlationId}:creditnote`),
          },
        });
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

/**
 * Agency settles an outstanding credit invoice via the gateway. Supports partial
 * payments (v3 §5.3): `amount` defaults to the full remaining balance; a smaller
 * amount pays it down and leaves the invoice PARTIALLY_PAID until fully cleared.
 */
export async function settleInvoice(invoiceId: string, agencyId: string, amount?: number): Promise<Invoice> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.agencyId !== agencyId) throw ApiError.notFound('Invoice not found');
  if (invoice.status !== 'ISSUED' && invoice.status !== 'PARTIALLY_PAID') throw ApiError.conflict('Invoice is not payable');

  const remaining = round2(Number(invoice.amount) - Number(invoice.amountPaid));
  if (remaining <= 0) throw ApiError.conflict('Invoice is already settled');
  const pay = amount === undefined ? remaining : round2(amount);
  if (pay <= 0) throw ApiError.badRequest('Payment amount must be greater than zero');
  if (pay > remaining) throw ApiError.badRequest(`Payment exceeds the outstanding balance of ${remaining}`);

  const capture = await getPaymentGateway().capture({ correlationId: invoice.correlationId, amount: pay, agencyId });
  if (capture.status !== 'SUCCEEDED') throw ApiError.badRequest('Payment was not completed');

  const newPaid = round2(Number(invoice.amountPaid) + pay);
  const fullySettled = newPaid >= Number(invoice.amount) - 0.001;

  const paid = await prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newPaid,
        status: fullySettled ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: fullySettled ? new Date() : null,
      },
    });
    await tx.payment.create({
      data: {
        agencyId,
        bookingId: invoice.bookingId,
        invoiceId: invoice.id,
        correlationId: invoice.correlationId,
        amount: pay,
        direction: 'INBOUND',
        status: 'SUCCEEDED',
        gatewayRef: capture.gatewayRef,
        completedAt: new Date(),
      },
    });
    await enqueueCrsEvent(tx, {
      eventType: 'PAYMENT',
      correlationId: invoice.correlationId,
      payload: { invoiceId: invoice.id, agencyId, amount: pay, gatewayRef: capture.gatewayRef, settlement: true, partial: !fullySettled },
    });
    return updated;
  });
  await recordAuditLogSafe({
    entityType: 'Invoice',
    entityId: invoice.id,
    event: fullySettled ? 'INVOICE_SETTLED' : 'INVOICE_PARTIALLY_PAID',
    actorId: null,
    actorRole: 'SYSTEM',
    after: { number: invoice.number, amount: pay, amountPaid: newPaid, invoiceAmount: Number(invoice.amount) },
  });
  const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { contactEmail: true, contactPhone: true } });
  if (agency) {
    await notify(
      { event: 'PAYMENT_RECEIVED', number: invoice.number, amount: pay },
      { email: agency.contactEmail, phone: agency.contactPhone },
      { entityType: 'Invoice', entityId: invoice.id },
    );
  }
  await flushInline();
  broadcast(['finance'], { agencyId });
  return paid;
}

/**
 * Records a chargeback (v3 §5.3): a previously SUCCEEDED inbound payment is
 * disputed and reversed by the gateway. Reverses the settled amount on the linked
 * invoice (re-opening AR), books an OUTBOUND CHARGEBACK payment, posts a CRS
 * CHARGEBACK event, and notifies the agency. Admin-initiated.
 */
export async function recordChargeback(
  paymentId: string,
  reason: string,
  actor: { actorId: string | null; actorRole: ActorRole },
): Promise<Payment> {
  const original = await prisma.payment.findUnique({ where: { id: paymentId }, include: { invoice: true } });
  if (!original) throw ApiError.notFound('Payment not found');
  if (original.direction !== 'INBOUND' || original.status !== 'SUCCEEDED') {
    throw ApiError.conflict('Only a successful inbound payment can be charged back');
  }
  const already = await prisma.payment.findFirst({
    where: { correlationId: original.correlationId, status: 'CHARGEBACK', gatewayRef: original.gatewayRef },
  });
  if (already) throw ApiError.conflict('This payment has already been charged back');

  const amount = Number(original.amount);
  const invoice = original.invoice;

  const chargeback = await prisma.$transaction(async (tx) => {
    const cb = await tx.payment.create({
      data: {
        agencyId: original.agencyId,
        bookingId: original.bookingId,
        invoiceId: original.invoiceId,
        correlationId: original.correlationId,
        amount,
        direction: 'OUTBOUND',
        status: 'CHARGEBACK',
        gatewayRef: original.gatewayRef,
        completedAt: new Date(),
      },
    });
    if (invoice) {
      // Reverse the settled amount; re-open AR (ISSUED/PARTIALLY_PAID) unless it was a refund basis.
      const newPaid = round2(Math.max(0, Number(invoice.amountPaid) - amount));
      const status = newPaid <= 0 ? 'ISSUED' : 'PARTIALLY_PAID';
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newPaid, status, paidAt: null },
      });
    }
    await enqueueCrsEvent(tx, {
      eventType: 'CHARGEBACK',
      correlationId: original.correlationId,
      payload: { paymentId: original.id, agencyId: original.agencyId, amount, gatewayRef: original.gatewayRef, reason },
    });
    return cb;
  });

  await recordAuditLogSafe({
    entityType: 'Payment',
    entityId: original.id,
    event: 'PAYMENT_CHARGEBACK',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    after: { amount, reason, chargebackId: chargeback.id, invoiceId: original.invoiceId },
  });
  const agency = await prisma.agency.findUnique({
    where: { id: original.agencyId },
    select: { contactEmail: true, contactPhone: true },
  });
  if (agency) {
    await notify(
      { event: 'PAYMENT_CHARGEBACK', number: invoice?.number ?? original.gatewayRef ?? original.id, amount, reason },
      { email: agency.contactEmail, phone: agency.contactPhone },
      { entityType: 'Payment', entityId: original.id },
    );
  }
  await flushInline();
  broadcast(['finance'], { agencyId: original.agencyId });
  return chargeback;
}

/** Admin — recent inbound payments with settlement/chargeback state (v3 §5.3). */
export async function listPayments(page: number, pageSize: number) {
  const where: Prisma.PaymentWhereInput = { direction: 'INBOUND' };
  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { agency: { select: { legalName: true } }, invoice: { select: { number: true } } },
    }),
    prisma.payment.count({ where }),
  ]);
  // A payment is "charged back" if a CHARGEBACK row shares its gatewayRef/correlationId.
  const refs = rows.map((p) => p.gatewayRef).filter((r): r is string => !!r);
  const chargedBack = new Set(
    (await prisma.payment.findMany({ where: { status: 'CHARGEBACK', gatewayRef: { in: refs } }, select: { gatewayRef: true } }))
      .map((p) => p.gatewayRef!),
  );
  const items = rows.map((p) => ({
    id: p.id,
    agencyName: p.agency.legalName,
    invoiceNumber: p.invoice?.number ?? null,
    amount: Number(p.amount),
    status: p.status,
    gatewayRef: p.gatewayRef,
    createdAt: p.createdAt,
    chargedBack: !!p.gatewayRef && chargedBack.has(p.gatewayRef),
  }));
  return { items, total, page, pageSize };
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
    prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { creditNotes: true },
    }),
    prisma.invoice.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
