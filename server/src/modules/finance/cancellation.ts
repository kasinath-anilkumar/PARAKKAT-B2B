import { env } from '../../config/env';
import { logger } from '../../lib/logger';

/**
 * Cancellation policy (Decision D4). Bands map "days before check-in" → charge %
 * on the AGENCY price (never the customer price, §4.13). The refund is the
 * remainder. Configurable via CANCELLATION_POLICY_JSON.
 */
export interface CancellationBand {
  minDaysBefore: number; // this band applies when daysBefore >= minDaysBefore
  chargePct: number;
}

// Default bands (business to confirm per D4). Sorted desc by minDaysBefore.
const DEFAULT_BANDS: CancellationBand[] = [
  { minDaysBefore: 7, chargePct: 0 }, // 7+ days: full refund
  { minDaysBefore: 3, chargePct: 25 }, // 3–6 days: 25% charge
  { minDaysBefore: 1, chargePct: 50 }, // 1–2 days: 50% charge
  { minDaysBefore: 0, chargePct: 100 }, // same day / no-show: no refund
];

let cachedBands: CancellationBand[] | undefined;

function getBands(): CancellationBand[] {
  if (cachedBands) return cachedBands;
  cachedBands = DEFAULT_BANDS;
  if (env.CANCELLATION_POLICY_JSON) {
    try {
      const parsed = JSON.parse(env.CANCELLATION_POLICY_JSON) as CancellationBand[];
      cachedBands = [...parsed].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
    } catch {
      logger.error('CANCELLATION_POLICY_JSON is not valid JSON; using default bands');
    }
  }
  return cachedBands;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export interface CancellationOutcome {
  daysBefore: number;
  chargePct: number;
  chargeAmount: number;
  refundAmount: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Computes the cancellation charge + refund for an agency price given when it's cancelled. */
export function computeCancellation(
  agencyPrice: number,
  checkIn: Date,
  cancelledAt: Date,
  bands: CancellationBand[] = getBands(),
): CancellationOutcome {
  const daysBefore = Math.max(0, daysBetween(cancelledAt, checkIn));
  const band = bands.find((b) => daysBefore >= b.minDaysBefore) ?? { minDaysBefore: 0, chargePct: 100 };
  const chargeAmount = round2((agencyPrice * band.chargePct) / 100);
  return {
    daysBefore,
    chargePct: band.chargePct,
    chargeAmount,
    refundAmount: round2(agencyPrice - chargeAmount),
  };
}
