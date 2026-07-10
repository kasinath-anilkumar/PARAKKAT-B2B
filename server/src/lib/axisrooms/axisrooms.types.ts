/**
 * AxisRooms is the source of truth for resorts, room types, availability, and
 * inventory (read-only for the portal), and receives reservation writes on
 * commit / reversals on cancel (Instructions.md §10, data ownership §3). The
 * portal keeps NO local master tables for this data.
 */

export interface Resort {
  id: string;
  name: string;
  location: string;
}

export interface RoomTypeAvailability {
  roomTypeId: string;
  roomTypeName: string;
  /** Rooms available for the requested dates/occupancy. */
  availableCount: number;
  maxOccupancy: number;
  /** Base rate per night (source per Decision D1; the mock supplies it). */
  baseRatePerNight: number;
}

export interface AvailabilityQuery {
  resortId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
}

export interface CreateReservationInput {
  /** Booking correlation id — reused as the idempotency key for the write. */
  correlationId: string;
  resortId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface CreateReservationResult {
  axisRoomsRef: string;
}

export interface AxisRoomsClient {
  /** Health probe used before allowing a commit (§10 — block, don't queue, on downtime). */
  healthCheck(): Promise<boolean>;
  listResorts(): Promise<Resort[]>;
  searchAvailability(query: AvailabilityQuery): Promise<RoomTypeAvailability[]>;
  /** Fresh read for a single room type — used to refresh-before-book. */
  getRoomType(resortId: string, roomTypeId: string): Promise<RoomTypeAvailability | null>;
  createReservation(input: CreateReservationInput): Promise<CreateReservationResult>;
  cancelReservation(axisRoomsRef: string): Promise<void>;
}
