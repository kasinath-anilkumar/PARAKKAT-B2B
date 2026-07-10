import crypto from 'node:crypto';
import { env } from '../../config/env';
import { logger } from '../logger';
import type {
  AvailabilityQuery,
  AxisRoomsClient,
  CreateReservationInput,
  CreateReservationResult,
  Resort,
  RoomTypeAvailability,
} from './axisrooms.types';

interface MockRoomType extends RoomTypeAvailability {
  resortId: string;
}

function stripResortId(rt: MockRoomType): RoomTypeAvailability {
  const { resortId: _resortId, ...rest } = rt;
  void _resortId;
  return rest;
}

const RESORTS: Resort[] = [
  { id: 'resort-goa', name: 'Parakkat Goa Beach Resort', location: 'Goa' },
  { id: 'resort-munnar', name: 'Parakkat Munnar Hills', location: 'Munnar, Kerala' },
  { id: 'resort-udaipur', name: 'Parakkat Udaipur Lake Palace', location: 'Udaipur, Rajasthan' },
];

const ROOM_TYPES: MockRoomType[] = [
  { resortId: 'resort-goa', roomTypeId: 'goa-deluxe', roomTypeName: 'Deluxe Sea View', availableCount: 5, maxOccupancy: 2, baseRatePerNight: 4500 },
  { resortId: 'resort-goa', roomTypeId: 'goa-suite', roomTypeName: 'Beach Suite', availableCount: 2, maxOccupancy: 4, baseRatePerNight: 8200 },
  { resortId: 'resort-munnar', roomTypeId: 'munnar-cottage', roomTypeName: 'Tea Garden Cottage', availableCount: 4, maxOccupancy: 3, baseRatePerNight: 5200 },
  { resortId: 'resort-munnar', roomTypeId: 'munnar-villa', roomTypeName: 'Hilltop Villa', availableCount: 1, maxOccupancy: 6, baseRatePerNight: 11000 },
  { resortId: 'resort-udaipur', roomTypeId: 'udaipur-lakeview', roomTypeName: 'Lake View Room', availableCount: 6, maxOccupancy: 2, baseRatePerNight: 6800 },
];

/**
 * In-memory AxisRooms stand-in for dev/test. Availability/rates are static;
 * reservations are tracked in a Map keyed by correlationId so writes are
 * idempotent (a retried commit for the same booking returns the same ref).
 * Downtime can be simulated with AXISROOMS_FORCE_DOWN=true to exercise the
 * block-don't-queue path.
 */
export class MockAxisRoomsClient implements AxisRoomsClient {
  private reservations = new Map<string, string>(); // correlationId -> axisRoomsRef

  async healthCheck(): Promise<boolean> {
    return !env.AXISROOMS_FORCE_DOWN;
  }

  async listResorts(): Promise<Resort[]> {
    return RESORTS;
  }

  async searchAvailability(query: AvailabilityQuery): Promise<RoomTypeAvailability[]> {
    return ROOM_TYPES.filter(
      (r) => r.resortId === query.resortId && r.maxOccupancy >= query.guests && r.availableCount > 0,
    ).map(stripResortId);
  }

  async getRoomType(resortId: string, roomTypeId: string): Promise<RoomTypeAvailability | null> {
    const rt = ROOM_TYPES.find((r) => r.resortId === resortId && r.roomTypeId === roomTypeId);
    return rt ? stripResortId(rt) : null;
  }

  async createReservation(input: CreateReservationInput): Promise<CreateReservationResult> {
    const existing = this.reservations.get(input.correlationId);
    if (existing) {
      return { axisRoomsRef: existing }; // idempotent
    }
    const axisRoomsRef = `AXR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    this.reservations.set(input.correlationId, axisRoomsRef);
    logger.info('[MockAxisRooms] reservation created', {
      correlationId: input.correlationId,
      axisRoomsRef,
    });
    return { axisRoomsRef };
  }

  async cancelReservation(axisRoomsRef: string): Promise<void> {
    for (const [key, ref] of this.reservations.entries()) {
      if (ref === axisRoomsRef) this.reservations.delete(key);
    }
    logger.info('[MockAxisRooms] reservation cancelled', { axisRoomsRef });
  }
}
