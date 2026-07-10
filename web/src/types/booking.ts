export type BookingState =
  | 'DRAFT'
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED_ON_CREDIT'
  | 'PAID'
  | 'CONFIRMED'
  | 'COMMITTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface Resort {
  id: string;
  name: string;
  location: string;
}

export interface PricedRoomType {
  roomTypeId: string;
  roomTypeName: string;
  maxOccupancy: number;
  availableCount: number;
  nights: number;
  agencyPricePerNight: number;
  agencyPriceTotal: number;
}

export interface Booking {
  id: string;
  resortName: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  agencyPrice: string;
  paymentMode: 'PREPAY' | 'CREDIT';
  state: BookingState;
  holdExpiresAt: string | null;
  axisRoomsRef: string | null;
  createdAt: string;
}
