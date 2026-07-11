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

/** Month key (YYYY-MM) list from `from` to `to`, inclusive. */
function monthsBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (d <= end) {
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out.slice(-6); // last 6 months of the window
}

/**
 * Agency-scoped report: booking metrics, per-agent performance and a financial
 * roll-up over a date range. Figures are the agency price. AGENCY-only.
 */
export async function agencyReport(agencyId: string, range: ReportRange) {
  const cancelledStates = new Set(['CANCELLED', 'EXPIRED']);
  const [bookings, agents, payments, config, outstandingAgg] = await Promise.all([
    prisma.booking.findMany({
      where: { agencyId, createdAt: { gte: range.from, lte: range.to } },
      select: { createdAt: true, agencyPrice: true, agentId: true, state: true },
    }),
    prisma.user.findMany({ where: { agencyId, role: 'AGENT' }, select: { id: true, name: true, email: true } }),
    prisma.payment.findMany({
      where: { agencyId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { invoice: { select: { number: true } } },
    }),
    prisma.commercialConfiguration.findFirst({ where: { agencyId, isCurrent: true } }),
    prisma.invoice.aggregate({
      where: { agencyId, paymentMode: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
      _sum: { amount: true, amountPaid: true },
    }),
  ]);

  const live = bookings.filter((b) => !cancelledStates.has(b.state));
  const revenue = Math.round(live.reduce((s, b) => s + Number(b.agencyPrice), 0) * 100) / 100;
  const cancelled = bookings.filter((b) => b.state === 'CANCELLED').length;
  const avgValue = live.length ? Math.round((revenue / live.length) * 100) / 100 : 0;
  const cancellationRate = bookings.length ? Math.round((cancelled / bookings.length) * 1000) / 10 : 0;

  const months = monthsBetween(range.from, range.to);
  const revByMonth = new Map<string, number>();
  for (const b of live) {
    const k = `${b.createdAt.getUTCFullYear()}-${String(b.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
    revByMonth.set(k, (revByMonth.get(k) ?? 0) + Number(b.agencyPrice));
  }
  const monthlySeries = months.map((m) => ({ month: m, value: Math.round((revByMonth.get(m) ?? 0) * 100) / 100 }));

  const nameById = new Map(agents.map((a) => [a.id, a.name ?? a.email]));
  const byAgent = new Map<string, { bookings: number; revenue: number }>();
  for (const b of bookings) {
    const cur = byAgent.get(b.agentId) ?? { bookings: 0, revenue: 0 };
    cur.bookings += 1;
    if (!cancelledStates.has(b.state)) cur.revenue += Number(b.agencyPrice);
    byAgent.set(b.agentId, cur);
  }
  const agentPerformance = [...byAgent.entries()]
    .map(([id, v]) => ({ id, name: nameById.get(id) ?? '—', bookings: v.bookings, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  const paid = payments.filter((p) => p.status === 'SUCCEEDED').reduce((s, p) => s + Number(p.amount), 0);
  const pending = payments.filter((p) => p.status === 'PENDING').reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.round(Math.max(0, Number(outstandingAgg._sum.amount ?? 0) - Number(outstandingAgg._sum.amountPaid ?? 0)) * 100) / 100;
  const creditLimit = config ? Number(config.creditLimit) : 0;

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    booking: { totalBookings: bookings.length, revenue, avgValue, cancellationRate, monthlySeries },
    agents: agentPerformance,
    financial: {
      paid: Math.round(paid * 100) / 100,
      pending: Math.round(pending * 100) / 100,
      outstanding,
      creditLimit,
      creditUsedPct: creditLimit > 0 ? Math.min(100, Math.round((outstanding / creditLimit) * 100)) : 0,
      payments: payments.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoice?.number ?? null,
        amount: Number(p.amount),
        status: p.status,
        createdAt: p.createdAt,
      })),
    },
  };
}
