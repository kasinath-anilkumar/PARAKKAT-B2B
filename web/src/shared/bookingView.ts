import type { Booking, BookingState } from '../types/booking';
import type { Tone } from '../components/ui/kit';

/** UI category derived from the authoritative booking state (+ stay dates). */
export type Category = 'Upcoming' | 'Pending' | 'Completed' | 'Cancelled';

export function bookingCategory(b: Booking): Category {
  if (b.state === 'CANCELLED' || b.state === 'EXPIRED') return 'Cancelled';
  // v3 §5.2 — commit-failed bookings are still being confirmed at the resort.
  if (b.state === 'AWAITING_PAYMENT' || b.state === 'DRAFT' || b.state === 'COMMIT_FAILED') return 'Pending';
  return new Date(b.checkOut) < new Date() ? 'Completed' : 'Upcoming';
}

export const CATEGORY_TONE: Record<Category, Tone> = {
  Upcoming: 'blue',
  Pending: 'amber',
  Completed: 'green',
  Cancelled: 'red',
};

const STATE_LABEL: Record<BookingState, string> = {
  DRAFT: 'Draft',
  AWAITING_PAYMENT: 'Awaiting payment',
  CONFIRMED_ON_CREDIT: 'Confirmed · credit',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  COMMITTED: 'Confirmed',
  COMMIT_FAILED: 'Confirming…',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};
export const stateLabel = (s: BookingState) => STATE_LABEL[s] ?? s;

export const STATE_TONE: Record<BookingState, Tone> = {
  DRAFT: 'slate',
  AWAITING_PAYMENT: 'amber',
  CONFIRMED_ON_CREDIT: 'blue',
  PAID: 'green',
  CONFIRMED: 'green',
  COMMITTED: 'green',
  COMMIT_FAILED: 'amber',
  CANCELLED: 'red',
  EXPIRED: 'slate',
};

export const money = (n: string | number) => `₹${Number(n).toLocaleString('en-IN')}`;

export const canPay = (b: Booking) => b.state === 'AWAITING_PAYMENT';
export const canCancel = (b: Booking) => b.state !== 'CANCELLED' && b.state !== 'EXPIRED';
