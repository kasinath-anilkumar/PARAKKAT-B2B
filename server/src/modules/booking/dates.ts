import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { getBookingWindowDays } from '../settings/settings.service';
import { nightsBetween } from './pricing';

/**
 * Authoritative stay-date validation for search and booking. Enforces, at
 * day-granularity:
 *   - well-formed dates,
 *   - check-in not in the past,
 *   - check-out strictly after check-in,
 *   - a maximum stay length (BOOKING_MAX_STAY_NIGHTS),
 *   - a maximum advance window (BOOKING_MAX_ADVANCE_DAYS).
 * Client-side `min`/`max` inputs mirror these for UX; this is the enforcement.
 */

/** Midnight today (server timezone) — the earliest valid check-in. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parse a YYYY-MM-DD string to local midnight; returns null if invalid. */
function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface ValidatedStay {
  checkIn: Date;
  checkOut: Date;
  nights: number;
}

export type StayType = 'OVERNIGHT' | 'DAY_USE';

/**
 * Validates stay dates. For OVERNIGHT, check-out must be strictly after check-in
 * and within the max-stay window. For DAY_USE (same-day), check-out is the arrival
 * day (nights = 0) — any provided checkOut is ignored. Both enforce the not-past
 * and max-advance-window rules.
 */
export function validateStayDates(
  checkInStr: string,
  checkOutStr?: string,
  stayType: StayType = 'OVERNIGHT',
): ValidatedStay {
  const checkIn = parseDay(checkInStr);
  if (!checkIn) throw ApiError.badRequest('Check-in must be a valid date (YYYY-MM-DD)');

  const today = startOfToday();
  if (checkIn < today) throw ApiError.badRequest('Check-in date cannot be in the past');

  // Advance window is admin-configurable (System Settings → Booking), falling
  // back to the env default until settings are loaded.
  const windowDays = getBookingWindowDays() || env.BOOKING_MAX_ADVANCE_DAYS;
  const maxCheckIn = new Date(today);
  maxCheckIn.setDate(maxCheckIn.getDate() + windowDays);
  if (checkIn > maxCheckIn) {
    throw ApiError.badRequest(`Check-in cannot be more than ${windowDays} days in advance`);
  }

  if (stayType === 'DAY_USE') {
    return { checkIn, checkOut: checkIn, nights: 0 };
  }

  const checkOut = checkOutStr ? parseDay(checkOutStr) : null;
  if (!checkOut) throw ApiError.badRequest('Check-out must be a valid date (YYYY-MM-DD)');
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw ApiError.badRequest('Check-out must be after check-in');
  if (nights > env.BOOKING_MAX_STAY_NIGHTS) {
    throw ApiError.badRequest(`A single booking cannot exceed ${env.BOOKING_MAX_STAY_NIGHTS} nights`);
  }

  return { checkIn, checkOut, nights };
}
