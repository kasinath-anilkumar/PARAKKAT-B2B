import { httpClient } from './httpClient';
import type { Booking, PricedRoomType, Resort } from '../types/booking';

export async function listResorts(): Promise<Resort[]> {
  const res = await httpClient.get('/catalog/resorts');
  return res.data.resorts;
}

export interface AvailabilityParams {
  resortId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export async function searchAvailability(params: AvailabilityParams): Promise<PricedRoomType[]> {
  const res = await httpClient.get('/catalog/availability', { params });
  return res.data.roomTypes;
}

export interface CreateBookingInput extends AvailabilityParams {
  roomTypeId: string;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const res = await httpClient.post('/bookings', input);
  return res.data;
}

export async function payBooking(id: string): Promise<Booking> {
  const res = await httpClient.post(`/bookings/${id}/pay`);
  return res.data;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const res = await httpClient.post(`/bookings/${id}/cancel`);
  return res.data;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listBookings(): Promise<Paged<Booking>> {
  const res = await httpClient.get('/bookings');
  return res.data;
}
