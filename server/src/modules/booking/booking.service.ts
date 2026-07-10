import type { Booking } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { getAxisRooms } from '../../lib/axisrooms';
import { broadcast } from '../../lib/realtime';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';
import {
  applyCancellation,
  collectPaymentForBooking,
  getOutstanding,
  recordBookingObligation,
} from '../finance/finance.service';
import { evaluateCreditGate } from './creditGate';
import { computeAgencyPrice, nightsBetween } from './pricing';

export interface AgentActor {
  userId: string;
  agencyId: string;
}

export interface CreateBookingInput {
  resortId: string;
  roomTypeId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  guests: number;
}

/** No agency transacts before Active (§7); a suspended agency is blocked. */
async function assertAgencyCanTransact(agencyId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw ApiError.notFound('Agency not found');
  if (agency.status !== 'ACTIVE' || !agency.activatedAt) {
    throw ApiError.forbidden('Agency is not active and cannot transact');
  }
  return agency;
}

async function getCurrentConfigOrThrow(agencyId: string) {
  const config = await prisma.commercialConfiguration.findFirst({
    where: { agencyId, isCurrent: true },
  });
  if (!config) throw ApiError.conflict('Agency has no commercial configuration');
  return config;
}

/** Pushes the reservation to AxisRooms and marks the booking COMMITTED (idempotent on correlationId). */
async function commitToAxisRooms(booking: Booking): Promise<Booking> {
  const axis = getAxisRooms();
  if (!(await axis.healthCheck())) {
    throw ApiError.serviceUnavailable('AxisRooms is unavailable — booking cannot be committed right now');
  }
  const { axisRoomsRef } = await axis.createReservation({
    correlationId: booking.correlationId,
    resortId: booking.resortId,
    roomTypeId: booking.roomTypeId,
    checkIn: booking.checkIn.toISOString().slice(0, 10),
    checkOut: booking.checkOut.toISOString().slice(0, 10),
    guests: booking.guests,
  });
  const committed = await prisma.booking.update({
    where: { id: booking.id },
    data: { state: 'COMMITTED', axisRoomsRef, committedAt: new Date() },
  });
  await recordAuditLogSafe({
    entityType: 'Booking',
    entityId: booking.id,
    event: 'BOOKING_COMMITTED',
    actorId: null,
    actorRole: 'SYSTEM',
    after: { axisRoomsRef, correlationId: booking.correlationId },
  });
  return committed;
}

export async function createBooking(input: CreateBookingInput, actor: AgentActor): Promise<Booking> {
  await assertAgencyCanTransact(actor.agencyId);
  const config = await getCurrentConfigOrThrow(actor.agencyId);

  const checkIn = new Date(input.checkIn);
  const checkOut = new Date(input.checkOut);
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw ApiError.badRequest('Check-out must be after check-in');

  const axis = getAxisRooms();
  // Block, don't queue: health-check before we let a booking proceed (§10).
  if (!(await axis.healthCheck())) {
    throw ApiError.serviceUnavailable('AxisRooms is unavailable — booking is temporarily disabled');
  }

  // Refresh-before-book: authoritative fresh read, not the cache.
  const roomType = await axis.getRoomType(input.resortId, input.roomTypeId);
  if (!roomType || roomType.availableCount < 1) {
    throw ApiError.conflict('Selected room type is no longer available');
  }
  if (roomType.maxOccupancy < input.guests) {
    throw ApiError.badRequest('Room type does not accommodate the requested occupancy');
  }
  const resort = (await axis.listResorts()).find((r) => r.id === input.resortId);
  if (!resort) throw ApiError.notFound('Resort not found');

  const markupPct = Number(config.markupPct);
  const price = computeAgencyPrice(roomType.baseRatePerNight, nights, markupPct);

  // The unified credit gate — one decision for both branches. Outstanding is
  // the sum of unpaid credit invoices (Phase 7 finance).
  const outstanding = await getOutstanding(actor.agencyId);
  const gate = evaluateCreditGate({
    paymentMode: config.paymentMode,
    outstandingBalance: outstanding,
    agencyPrice: price.agencyPrice,
    effectiveCreditLimit: Number(config.creditLimit),
  });

  const base = {
    agencyId: actor.agencyId,
    agentId: actor.userId,
    resortId: input.resortId,
    resortName: resort.name,
    roomTypeId: input.roomTypeId,
    roomTypeName: roomType.roomTypeName,
    checkIn,
    checkOut,
    nights,
    guests: input.guests,
    baseRate: price.baseTotal,
    agencyPrice: price.agencyPrice,
    markupPct,
  };

  if (gate.branch === 'confirm_on_credit') {
    const booking = await prisma.booking.create({
      data: { ...base, paymentMode: 'CREDIT', state: 'CONFIRMED_ON_CREDIT' },
    });
    await recordAuditLogSafe({
      entityType: 'Booking',
      entityId: booking.id,
      event: 'BOOKING_CONFIRMED_ON_CREDIT',
      actorId: actor.userId,
      actorRole: 'AGENT',
      after: { agencyPrice: price.agencyPrice, projectedBalance: gate.projectedBalance },
    });
    // Both branches converge on commit → push to AxisRooms.
    const committed = await commitToAxisRooms(booking);
    // Record the credit obligation: an ISSUED invoice + CRS ledger event.
    await recordBookingObligation(committed, config.paymentTerms);
    broadcast(['bookings', 'finance'], { agencyId: actor.agencyId });
    return committed;
  }

  // Pay-first branch: tentative hold in the portal (NOT AxisRooms) with a TTL.
  const holdExpiresAt = new Date(Date.now() + env.BOOKING_HOLD_TTL_MINUTES * 60 * 1000);
  const booking = await prisma.booking.create({
    data: { ...base, paymentMode: 'PREPAY', state: 'AWAITING_PAYMENT', holdExpiresAt },
  });
  await recordAuditLogSafe({
    entityType: 'Booking',
    entityId: booking.id,
    event: 'BOOKING_AWAITING_PAYMENT',
    actorId: actor.userId,
    actorRole: 'AGENT',
    after: { agencyPrice: price.agencyPrice, holdExpiresAt },
  });
  broadcast(['bookings', 'finance'], { agencyId: actor.agencyId });
  return booking;
}

/** Lazily expires a hold that has passed its TTL. Returns the (possibly updated) booking. */
async function expireIfLapsed(booking: Booking): Promise<Booking> {
  if (
    booking.state === 'AWAITING_PAYMENT' &&
    booking.holdExpiresAt &&
    booking.holdExpiresAt.getTime() < Date.now()
  ) {
    const expired = await prisma.booking.update({
      where: { id: booking.id },
      data: { state: 'EXPIRED' },
    });
    await recordAuditLogSafe({
      entityType: 'Booking',
      entityId: booking.id,
      event: 'BOOKING_HOLD_EXPIRED',
      actorId: null,
      actorRole: 'SYSTEM',
    });
    return expired;
  }
  return booking;
}

async function loadOwnedBooking(bookingId: string, agencyId: string): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.agencyId !== agencyId) {
    throw ApiError.notFound('Booking not found');
  }
  return booking;
}

/**
 * Marks a pay-first booking paid and commits it. Payment is mocked here — the
 * real gateway (Decision D2-a) + CRS posting arrive in Phase 7. Only valid
 * while the tentative hold is still live.
 */
export async function payBooking(bookingId: string, actor: AgentActor): Promise<Booking> {
  let booking = await loadOwnedBooking(bookingId, actor.agencyId);
  booking = await expireIfLapsed(booking);
  if (booking.state === 'EXPIRED') {
    throw ApiError.conflict('The tentative hold expired — please create a new booking');
  }
  if (booking.state !== 'AWAITING_PAYMENT') {
    throw ApiError.conflict(`Booking is not awaiting payment (state: ${booking.state})`);
  }

  // Collect payment via the gateway → records a SUCCEEDED payment, a PAID
  // invoice, and a CRS PAYMENT event (Phase 7). Throws if capture fails,
  // leaving the booking awaiting payment.
  await collectPaymentForBooking(booking);

  const paid = await prisma.booking.update({
    where: { id: booking.id },
    data: { state: 'PAID', paidAt: new Date() },
  });
  await recordAuditLogSafe({
    entityType: 'Booking',
    entityId: booking.id,
    event: 'BOOKING_PAID',
    actorId: actor.userId,
    actorRole: 'AGENT',
  });
  // Converge with the credit branch: confirm + commit to AxisRooms.
  const committed = await commitToAxisRooms({ ...paid, state: 'CONFIRMED' });
  broadcast(['bookings', 'finance'], { agencyId: actor.agencyId });
  return committed;
}

export async function cancelBooking(bookingId: string, actor: AgentActor): Promise<Booking> {
  const booking = await loadOwnedBooking(bookingId, actor.agencyId);
  if (booking.state === 'CANCELLED' || booking.state === 'EXPIRED') {
    throw ApiError.conflict(`Booking is already ${booking.state.toLowerCase()}`);
  }

  // Reverse the AxisRooms reservation if one was committed.
  if (booking.state === 'COMMITTED' && booking.axisRoomsRef) {
    await getAxisRooms().cancelReservation(booking.axisRoomsRef);
  }

  const cancelledAt = new Date();
  // Apply the cancellation policy: charge/refund + balance adjustment + CRS
  // events. Only relevant once an invoice exists (i.e. the booking committed).
  if (booking.state === 'COMMITTED') {
    await applyCancellation(booking, cancelledAt);
  }

  const cancelled = await prisma.booking.update({
    where: { id: booking.id },
    data: { state: 'CANCELLED', cancelledAt },
  });
  await recordAuditLogSafe({
    entityType: 'Booking',
    entityId: booking.id,
    event: 'BOOKING_CANCELLED',
    actorId: actor.userId,
    actorRole: 'AGENT',
    before: { state: booking.state },
  });
  broadcast(['bookings', 'finance'], { agencyId: actor.agencyId });
  return cancelled;
}

export async function getBooking(bookingId: string, actor: AgentActor): Promise<Booking> {
  const booking = await loadOwnedBooking(bookingId, actor.agencyId);
  return expireIfLapsed(booking);
}

export async function listBookings(agencyId: string, page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.booking.count({ where: { agencyId } }),
  ]);
  return { items, total, page, pageSize };
}

/** Sweeps expired holds (for a scheduled worker). Returns the number expired. */
export async function expireStaleHolds(): Promise<number> {
  const stale = await prisma.booking.findMany({
    where: { state: 'AWAITING_PAYMENT', holdExpiresAt: { lt: new Date() } },
  });
  for (const booking of stale) {
    await expireIfLapsed(booking);
  }
  return stale.length;
}
