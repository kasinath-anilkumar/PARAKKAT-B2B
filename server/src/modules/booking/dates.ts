import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
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

export function validateStayDates(checkInStr: string, checkOutStr: string): ValidatedStay {
  const checkIn = parseDay(checkInStr);
  const checkOut = parseDay(checkOutStr);
  if (!checkIn || !checkOut) throw ApiError.badRequest('Check-in and check-out must be valid dates (YYYY-MM-DD)');

  const today = startOfToday();
  if (checkIn < today) throw ApiError.badRequest('Check-in date cannot be in the past');

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw ApiError.badRequest('Check-out must be after check-in');
  if (nights > env.BOOKING_MAX_STAY_NIGHTS) {
    throw ApiError.badRequest(`A single booking cannot exceed ${env.BOOKING_MAX_STAY_NIGHTS} nights`);
  }

  const maxCheckIn = new Date(today);
  maxCheckIn.setDate(maxCheckIn.getDate() + env.BOOKING_MAX_ADVANCE_DAYS);
  if (checkIn > maxCheckIn) {
    throw ApiError.badRequest(`Check-in cannot be more than ${env.BOOKING_MAX_ADVANCE_DAYS} days in advance`);
  }

  return { checkIn, checkOut, nights };
}
