import type { ActorRole, Prisma, RatePlanCode } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';

/**
 * v3 §2.3 — server-side room-charge composition. The portal owns the agency
 * price only; the customer price is never computed or stored. A client-supplied
 * price is never trusted — every booking recomputes here.
 *
 *   room charge = rate-plan rate + Σ extra-adult + child + extra-bed  (per night)
 *   agency price = room charge total × (1 + markup%)     (D10: single markup on total)
 */

export interface Occupancy {
  adults: number;
  children: number;
  extraBeds: number;
  // v3 §2.2 — ages of the children in the room; when present, drives age-band
  // pricing and overrides `children` as the child count.
  childAges?: number[];
}

// v3 §2.2 — a child age band: inclusive [minAge, maxAge] → per-night charge.
export interface ChildBand {
  minAge: number;
  maxAge: number;
  charge: number;
}

export interface RoomPricingConfig {
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  extraAdultCharge: number;
  childCharge: number;
  extraBedCharge: number;
  childBands?: ChildBand[];
}

/** v3 §2.2 — per-night charge for one child by age (first matching band; none → free). */
function childCharge(age: number, bands: ChildBand[], flat: number): number {
  if (!bands.length) return flat;
  const band = bands.find((b) => age >= b.minAge && age <= b.maxAge);
  return band ? band.charge : 0;
}

export interface ComposedCharge {
  plan: RatePlanCode;
  nights: number;
  occupancy: { adults: number; children: number; extraBeds: number; baseOccupancy: number; childAges?: number[] };
  perNight: {
    base: number;
    extraAdults: number;
    extraAdultAmount: number;
    childAmount: number;
    extraBedAmount: number;
    total: number;
  };
  roomChargeTotal: number; // pre-markup, across the stay
  markupPct: number;
  agencyPrice: number; // post-markup
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Pure composition (§2.3) — validates occupancy, then builds the charge. */
export function composeRoomCharge(
  baseRate: number,
  plan: RatePlanCode,
  cfg: RoomPricingConfig,
  occ: Occupancy,
  nights: number,
  markupPct: number,
): ComposedCharge {
  // v3 §2.2 — when ages are supplied they define the child count authoritatively.
  const childAges = occ.childAges;
  const children = childAges ? childAges.length : occ.children;

  if (nights <= 0) throw ApiError.badRequest('Check-out must be after check-in');
  if (occ.adults < 1) throw ApiError.badRequest('At least one adult is required');
  if (occ.extraBeds < 0 || children < 0) throw ApiError.badRequest('Invalid occupancy');
  if (childAges && childAges.some((a) => a < 0 || a > 17)) throw ApiError.badRequest('Child ages must be between 0 and 17');
  if (occ.adults > cfg.maxAdults) throw ApiError.badRequest(`This room allows at most ${cfg.maxAdults} adults`);
  if (children > cfg.maxChildren) throw ApiError.badRequest(`This room allows at most ${cfg.maxChildren} children`);
  if (occ.adults + children + occ.extraBeds > cfg.maxOccupancy) {
    throw ApiError.badRequest(`This room's maximum occupancy is ${cfg.maxOccupancy}`);
  }

  const bands = cfg.childBands ?? [];
  const extraAdults = Math.max(0, occ.adults - cfg.baseOccupancy);
  const extraAdultAmount = round2(extraAdults * cfg.extraAdultCharge);
  // v3 §2.2 — age-band child pricing when ages + bands are present; otherwise the
  // flat per-child charge applied to the child count.
  const childAmount = childAges
    ? round2(childAges.reduce((sum, age) => sum + childCharge(age, bands, cfg.childCharge), 0))
    : round2(children * cfg.childCharge);
  const extraBedAmount = round2(occ.extraBeds * cfg.extraBedCharge);
  const total = round2(baseRate + extraAdultAmount + childAmount + extraBedAmount);

  const roomChargeTotal = round2(total * nights);
  const agencyPrice = round2(roomChargeTotal * (1 + markupPct / 100));

  return {
    plan,
    nights,
    occupancy: { adults: occ.adults, children, extraBeds: occ.extraBeds, baseOccupancy: cfg.baseOccupancy, childAges },
    perNight: { base: round2(baseRate), extraAdults, extraAdultAmount, childAmount, extraBedAmount, total },
    roomChargeTotal,
    markupPct,
    agencyPrice,
  };
}

type PricingWithPlans = Prisma.RoomTypePricingGetPayload<{ include: { ratePlans: true } }>;

export async function resolveRoomPricing(resortId: string, roomTypeId: string): Promise<PricingWithPlans | null> {
  return prisma.roomTypePricing.findUnique({
    where: { resortId_roomTypeId: { resortId, roomTypeId } },
    include: { ratePlans: { where: { active: true } } },
  });
}

/** v3 §2.2 — coerce the stored childBands JSON into typed, sorted bands. */
function parseChildBands(raw: unknown): ChildBand[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is ChildBand => !!b && typeof b === 'object' && 'minAge' in b && 'maxAge' in b && 'charge' in b)
    .map((b) => ({ minAge: Number(b.minAge), maxAge: Number(b.maxAge), charge: Number(b.charge) }))
    .sort((a, b) => a.minAge - b.minAge);
}

const toConfig = (p: PricingWithPlans): RoomPricingConfig => ({
  baseOccupancy: p.baseOccupancy,
  maxAdults: p.maxAdults,
  maxChildren: p.maxChildren,
  maxOccupancy: p.maxOccupancy,
  extraAdultCharge: Number(p.extraAdultCharge),
  childCharge: Number(p.childCharge),
  extraBedCharge: Number(p.extraBedCharge),
  childBands: parseChildBands(p.childBands),
});

/** Picks the applicable rate for a plan on a date — dated windows override the null-window default. */
function pickRate(rates: PricingWithPlans['ratePlans'], plan: RatePlanCode, on: Date): number | null {
  const matches = rates.filter(
    (r) =>
      r.plan === plan &&
      r.active &&
      (!r.effectiveFrom || r.effectiveFrom <= on) &&
      (!r.effectiveTo || r.effectiveTo >= on),
  );
  if (!matches.length) return null;
  matches.sort((a, b) => (b.effectiveFrom?.getTime() ?? -Infinity) - (a.effectiveFrom?.getTime() ?? -Infinity));
  return Number(matches[0].baseRate);
}

export interface PriceRoomInput {
  resortId: string;
  roomTypeId: string;
  plan: RatePlanCode;
  checkIn: Date;
  nights: number;
  occupancy: Occupancy;
  markupPct: number;
  /** AxisRooms base rate, used only as a fallback when no portal pricing is configured. */
  axisBaseRate?: number;
}

/** Price one room for a specific plan (used at booking commit). Throws if the plan/occupancy is invalid. */
export async function priceRoom(input: PriceRoomInput): Promise<ComposedCharge> {
  const cfg = await resolveRoomPricing(input.resortId, input.roomTypeId);
  if (cfg) {
    const rate = pickRate(cfg.ratePlans, input.plan, input.checkIn);
    if (rate == null) throw ApiError.badRequest(`Rate plan ${input.plan} is not available for these dates`);
    return composeRoomCharge(rate, input.plan, toConfig(cfg), input.occupancy, input.nights, input.markupPct);
  }
  // Fallback: unconfigured room → EP only, AxisRooms base, no occupancy extras.
  if (input.plan !== 'EP') throw ApiError.badRequest('Only the room-only (EP) plan is available for this room');
  const fallback: RoomPricingConfig = {
    baseOccupancy: input.occupancy.adults,
    maxAdults: 99,
    maxChildren: 99,
    maxOccupancy: 99,
    extraAdultCharge: 0,
    childCharge: 0,
    extraBedCharge: 0,
  };
  return composeRoomCharge(input.axisBaseRate ?? 0, 'EP', fallback, input.occupancy, input.nights, input.markupPct);
}

/** Price every available plan for a room (used in availability search). Invalid plans/occupancy are skipped. */
export async function pricePlansForRoom(input: Omit<PriceRoomInput, 'plan'>): Promise<ComposedCharge[]> {
  const cfg = await resolveRoomPricing(input.resortId, input.roomTypeId);
  if (!cfg || cfg.ratePlans.length === 0) {
    try {
      return [await priceRoom({ ...input, plan: 'EP' })];
    } catch {
      return [];
    }
  }
  const config = toConfig(cfg);
  const plans = [...new Set(cfg.ratePlans.map((r) => r.plan))];
  const out: ComposedCharge[] = [];
  for (const plan of plans) {
    const rate = pickRate(cfg.ratePlans, plan, input.checkIn);
    if (rate == null) continue;
    try {
      out.push(composeRoomCharge(rate, plan, config, input.occupancy, input.nights, input.markupPct));
    } catch {
      // occupancy invalid for this room → skip the plan
    }
  }
  return out.sort((a, b) => a.agencyPrice - b.agencyPrice);
}

// --- Admin CRUD (v3 §2.4 base pricing management) ----------------------------

interface Actor {
  actorId: string;
  actorRole: ActorRole;
}

export async function listPricingConfigs() {
  return prisma.roomTypePricing.findMany({
    include: { ratePlans: { orderBy: { plan: 'asc' } } },
    orderBy: [{ resortId: 'asc' }, { roomTypeName: 'asc' }],
  });
}

export interface UpsertPricingInput {
  resortId: string;
  roomTypeId: string;
  roomTypeName: string;
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  extraAdultCharge: number;
  childCharge: number;
  extraBedCharge: number;
  childBands?: ChildBand[]; // v3 §2.2
  rates: { plan: RatePlanCode; baseRate: number }[];
}

export async function upsertPricingConfig(input: UpsertPricingInput, actor: Actor) {
  const { rates, resortId, roomTypeId, childBands, ...rest } = input;
  const fields = { ...rest, childBands: (childBands ?? []) as unknown as Prisma.InputJsonValue };
  const config = await prisma.roomTypePricing.upsert({
    where: { resortId_roomTypeId: { resortId, roomTypeId } },
    create: { resortId, roomTypeId, ...fields },
    update: fields,
  });
  // Replace only the null-window DEFAULT rates; dated rate-calendar windows
  // (v3 §2.4) are preserved so editing base pricing never wipes seasonal rates.
  await prisma.$transaction([
    prisma.ratePlanRate.deleteMany({ where: { roomTypePricingId: config.id, effectiveFrom: null, effectiveTo: null } }),
    prisma.ratePlanRate.createMany({
      data: rates.map((r) => ({ roomTypePricingId: config.id, plan: r.plan, baseRate: r.baseRate })),
    }),
  ]);
  await recordAuditLogSafe({
    entityType: 'RoomTypePricing',
    entityId: config.id,
    event: 'PRICING_CONFIG_UPSERTED',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    after: { resortId, roomTypeId, plans: rates.map((r) => r.plan) },
  });
  return prisma.roomTypePricing.findUnique({ where: { id: config.id }, include: { ratePlans: true } });
}

export async function deletePricingConfig(id: string, actor: Actor) {
  const existing = await prisma.roomTypePricing.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Pricing config not found');
  await prisma.roomTypePricing.delete({ where: { id } });
  await recordAuditLogSafe({
    entityType: 'RoomTypePricing',
    entityId: id,
    event: 'PRICING_CONFIG_DELETED',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    before: { resortId: existing.resortId, roomTypeId: existing.roomTypeId },
  });
  return { deleted: true };
}

// --- Rate calendar (v3 §2.4 bulk seasonal / dated-window tooling) -------------

/** Parse a YYYY-MM-DD boundary to a UTC date (from = start-of-day, to = end-of-day inclusive). */
function boundary(date: string, edge: 'from' | 'to'): Date {
  return new Date(`${date}T${edge === 'from' ? '00:00:00.000' : '23:59:59.999'}Z`);
}

export interface RateCalendarInput {
  resortId: string;
  // One or more room types at the resort to apply the window to.
  roomTypeIds: string[];
  // One or more plans to set at this rate over the window.
  plans: RatePlanCode[];
  baseRate: number;
  effectiveFrom: string; // YYYY-MM-DD (inclusive)
  effectiveTo: string; // YYYY-MM-DD (inclusive)
  note?: string;
}

/**
 * v3 §2.4 — bulk-apply a dated rate window across many room types and plans in
 * one action (the rate calendar). A window with the same (room, plan, from, to)
 * is updated in place; otherwise a new dated override is created. Dated windows
 * override the null-window default in the pricing engine (pickRate).
 */
export async function applyRateCalendar(input: RateCalendarInput, actor: Actor) {
  const from = boundary(input.effectiveFrom, 'from');
  const to = boundary(input.effectiveTo, 'to');
  if (to < from) throw ApiError.badRequest('effectiveTo must be on or after effectiveFrom');
  if (input.roomTypeIds.length === 0 || input.plans.length === 0) {
    throw ApiError.badRequest('Select at least one room type and one plan');
  }

  const configs = await prisma.roomTypePricing.findMany({
    where: { resortId: input.resortId, roomTypeId: { in: input.roomTypeIds } },
  });
  const byRoom = new Map(configs.map((c) => [c.roomTypeId, c]));

  let created = 0;
  let updated = 0;
  const skipped: string[] = [];
  for (const roomTypeId of input.roomTypeIds) {
    const cfg = byRoom.get(roomTypeId);
    if (!cfg) {
      skipped.push(roomTypeId); // no base pricing configured for this room type
      continue;
    }
    for (const plan of input.plans) {
      const existing = await prisma.ratePlanRate.findFirst({
        where: { roomTypePricingId: cfg.id, plan, effectiveFrom: from, effectiveTo: to },
      });
      if (existing) {
        await prisma.ratePlanRate.update({ where: { id: existing.id }, data: { baseRate: input.baseRate, active: true } });
        updated += 1;
      } else {
        await prisma.ratePlanRate.create({
          data: { roomTypePricingId: cfg.id, plan, baseRate: input.baseRate, effectiveFrom: from, effectiveTo: to },
        });
        created += 1;
      }
    }
  }

  await recordAuditLogSafe({
    entityType: 'RoomTypePricing',
    entityId: input.resortId,
    event: 'RATE_CALENDAR_APPLIED',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    after: {
      resortId: input.resortId,
      roomTypeIds: input.roomTypeIds,
      plans: input.plans,
      baseRate: input.baseRate,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      note: input.note ?? null,
      created,
      updated,
      skipped,
    },
  });
  return { created, updated, skipped };
}

/** v3 §2.4 — list dated rate windows (the calendar), newest first, with room labels. */
export async function listRateCalendar(resortId?: string) {
  const windows = await prisma.ratePlanRate.findMany({
    where: {
      effectiveFrom: { not: null },
      roomTypePricing: resortId ? { resortId } : undefined,
    },
    include: { roomTypePricing: { select: { resortId: true, roomTypeId: true, roomTypeName: true } } },
    orderBy: [{ effectiveFrom: 'desc' }, { plan: 'asc' }],
  });
  return windows.map((w) => ({
    id: w.id,
    plan: w.plan,
    baseRate: w.baseRate,
    effectiveFrom: w.effectiveFrom,
    effectiveTo: w.effectiveTo,
    active: w.active,
    resortId: w.roomTypePricing.resortId,
    roomTypeId: w.roomTypePricing.roomTypeId,
    roomTypeName: w.roomTypePricing.roomTypeName,
  }));
}

/** v3 §2.4 — remove a single dated rate window. */
export async function deleteRateWindow(id: string, actor: Actor) {
  const existing = await prisma.ratePlanRate.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Rate window not found');
  if (!existing.effectiveFrom) throw ApiError.badRequest('Default rates are managed from base pricing, not the calendar');
  await prisma.ratePlanRate.delete({ where: { id } });
  await recordAuditLogSafe({
    entityType: 'RoomTypePricing',
    entityId: existing.roomTypePricingId,
    event: 'RATE_CALENDAR_WINDOW_DELETED',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    before: { plan: existing.plan, effectiveFrom: existing.effectiveFrom, effectiveTo: existing.effectiveTo },
  });
  return { deleted: true };
}
