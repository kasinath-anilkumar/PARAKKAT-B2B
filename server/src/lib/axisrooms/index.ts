import { env } from '../../config/env';
import { LiveAxisRoomsClient } from './liveAxisRooms';
import { MockAxisRoomsClient } from './mockAxisRooms';
import type { AxisRoomsClient } from './axisrooms.types';

export type {
  AxisRoomsClient,
  AvailabilityQuery,
  CreateReservationInput,
  CreateReservationResult,
  Resort,
  RoomTypeAvailability,
} from './axisrooms.types';

let instance: AxisRoomsClient | undefined;

export function getAxisRooms(): AxisRoomsClient {
  if (!instance) {
    instance = env.AXISROOMS_PROVIDER === 'live' ? new LiveAxisRoomsClient() : new MockAxisRoomsClient();
  }
  return instance;
}
