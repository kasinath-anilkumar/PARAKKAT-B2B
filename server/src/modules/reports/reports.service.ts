import { prisma } from '../../lib/prisma';

export interface ReportRange {
  from: Date;
  to: Date;
}

export function defaultReportRange(): ReportRange {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 29);
  return { from, to };
}

/**
 * Company-wide reporting (Instructions.md §4.12 / §13 Phase 8): revenue and
 * bookings broken down by agency and by resort over a date range. All figures
 * are the agency price (never the customer price).
 */
export async function reportSummary(range: ReportRange) {
  const [payByAgency, bookByAgency, outstandingByAgency, byResort] = await Promise.all([
    prisma.payment.groupBy({
      by: ['agencyId'],
      where: { direction: 'INBOUND', status: 'SUCCEEDED', completedAt: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
    }),
    prisma.booking.groupBy({
      by: ['agencyId'],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    }),
    prisma.invoice.groupBy({
      by: ['agencyId'],
      where: { status: 'ISSUED', paymentMode: 'CREDIT' },
      _sum: { amount: true },
    }),
    prisma.booking.groupBy({
      by: ['resortId', 'resortName'],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
      _sum: { agencyPrice: true },
    }),
  ]);

  const agencyIds = new Set<string>([
    ...payByAgency.map((r) => r.agencyId),
    ...bookByAgency.map((r) => r.agencyId),
    ...outstandingByAgency.map((r) => r.agencyId),
  ]);
  const agencies = await prisma.agency.findMany({
    where: { id: { in: [...agencyIds] } },
    select: { id: true, legalName: true },
  });
  const nameById = new Map(agencies.map((a) => [a.id, a.legalName]));
  const revenueById = new Map(payByAgency.map((r) => [r.agencyId, Number(r._sum.amount ?? 0)]));
  const bookingsById = new Map(bookByAgency.map((r) => [r.agencyId, r._count._all]));
  const outstandingById = new Map(outstandingByAgency.map((r) => [r.agencyId, Number(r._sum.amount ?? 0)]));

  const revenueByAgency = [...agencyIds]
    .map((id) => ({
      agencyId: id,
      agencyName: nameById.get(id) ?? '(unknown)',
      bookings: bookingsById.get(id) ?? 0,
      revenue: revenueById.get(id) ?? 0,
      outstanding: outstandingById.get(id) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const bookingsByResort = byResort
    .map((r) => ({
      resortId: r.resortId,
      resortName: r.resortName,
      bookings: r._count._all,
      revenue: Number(r._sum.agencyPrice ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    totals: {
      revenue: revenueByAgency.reduce((s, r) => s + r.revenue, 0),
      bookings: bookingsByResort.reduce((s, r) => s + r.bookings, 0),
      outstanding: revenueByAgency.reduce((s, r) => s + r.outstanding, 0),
    },
    revenueByAgency,
    bookingsByResort,
  };
}
