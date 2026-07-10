import { prisma } from '../../lib/prisma';

/**
 * Reconciliation (Instructions.md §10) — flags drift between the portal, the
 * reservation system, and the CRS so Admin can investigate. Every confirmed
 * booking, payment and refund should be traceable across all three by
 * correlation id with zero unexplained drift.
 */
export interface DriftReport {
  committedWithoutAxisRef: number; // committed bookings missing a reservation ref
  committedWithoutInvoice: number; // committed bookings with no invoice
  pendingCrsEvents: number; // CRS postings not yet delivered
  failedCrsEvents: number; // CRS postings that exhausted retries
  generatedAt: string;
  clean: boolean;
}

export async function runReconciliation(): Promise<DriftReport> {
  const [committedWithoutAxisRef, committedBookings, invoiceBookingIds, pendingCrsEvents, failedCrsEvents] =
    await Promise.all([
      prisma.booking.count({ where: { state: 'COMMITTED', axisRoomsRef: null } }),
      prisma.booking.findMany({ where: { state: 'COMMITTED' }, select: { id: true } }),
      prisma.invoice.findMany({ select: { bookingId: true } }),
      prisma.crsOutboxEvent.count({ where: { status: 'PENDING' } }),
      prisma.crsOutboxEvent.count({ where: { status: 'FAILED' } }),
    ]);

  const invoiced = new Set(invoiceBookingIds.map((i) => i.bookingId));
  const committedWithoutInvoice = committedBookings.filter((b) => !invoiced.has(b.id)).length;

  const clean =
    committedWithoutAxisRef === 0 &&
    committedWithoutInvoice === 0 &&
    pendingCrsEvents === 0 &&
    failedCrsEvents === 0;

  return {
    committedWithoutAxisRef,
    committedWithoutInvoice,
    pendingCrsEvents,
    failedCrsEvents,
    generatedAt: new Date().toISOString(),
    clean,
  };
}
