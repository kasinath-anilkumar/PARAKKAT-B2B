import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const availabilityQuerySchema = z.object({
  resortId: z.string().min(1),
  checkIn: dateString,
  checkOut: dateString,
  guests: z.coerce.number().int().positive().max(20),
});

export const createBookingSchema = z.object({
  resortId: z.string().min(1),
  roomTypeId: z.string().min(1),
  checkIn: dateString,
  checkOut: dateString,
  guests: z.number().int().positive().max(20),
});

export const bookingIdParamSchema = z.object({ id: z.string().uuid() });

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
