import { env } from '../../config/env';
import { LiveAxisRoomsClient } from './liveAxisRooms';
import { MockAxisRoomsClient } from './mockAxisRooms';
import type { AxisRoomsClient } from './axisrooms.types';

export type {
  AxisRoomsClient,
  AvailabilityQuery,
  CreateReservationInput,
  CreateReservationResult,
  DayUseOption,
  OccupancyConfig,
  RatePlan,
  RatePlanCode,
  RatesQuery,
  ReservationRoom,
  Resort,
  Restrictions,
  RoomTypeAvailability,
  RoomTypeRates,
  StayType,
} from './axisrooms.types';

let instance: AxisRoomsClient | undefined;

export function getAxisRooms(): AxisRoomsClient {
  if (!instance) {
    instance = env.AXISROOMS_PROVIDER === 'live' ? new LiveAxisRoomsClient() : new MockAxisRoomsClient();
  }
  return instance;
}
