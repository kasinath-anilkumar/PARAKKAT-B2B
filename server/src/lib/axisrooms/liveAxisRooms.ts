import type {
  AvailabilityQuery,
  AxisRoomsClient,
  CreateReservationInput,
  CreateReservationResult,
  RatesQuery,
  Resort,
  RoomTypeAvailability,
  RoomTypeRates,
} from './axisrooms.types';

/**
 * Live AxisRooms client skeleton. Real HTTP calls against AXISROOMS_BASE_URL go
 * here. Left unimplemented because sandbox credentials / API contracts are not
 * available; the mock drives the booking pipeline. Decision D6 (confirm
 * reservation *write* is supported, not read-only) must be verified before
 * wiring `createReservation`/`cancelReservation`.
 */
export class LiveAxisRoomsClient implements AxisRoomsClient {
  private notImplemented(method: string): never {
    throw new Error(
      `LiveAxisRoomsClient.${method} is not implemented — provide AxisRooms API contracts and set AXISROOMS_PROVIDER=live`,
    );
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
  async listResorts(): Promise<Resort[]> {
    this.notImplemented('listResorts');
  }
  async listRoomTypes(_resortId: string): Promise<RoomTypeAvailability[]> {
    this.notImplemented('listRoomTypes');
  }
  async searchAvailability(_query: AvailabilityQuery): Promise<RoomTypeAvailability[]> {
    this.notImplemented('searchAvailability');
  }
  async getRoomType(_resortId: string, _roomTypeId: string): Promise<RoomTypeAvailability | null> {
    this.notImplemented('getRoomType');
  }
  async getRoomTypeRates(_query: RatesQuery): Promise<RoomTypeRates | null> {
    this.notImplemented('getRoomTypeRates');
  }
  async createReservation(_input: CreateReservationInput): Promise<CreateReservationResult> {
    this.notImplemented('createReservation');
  }
  async cancelReservation(_axisRoomsRef: string): Promise<void> {
    this.notImplemented('cancelReservation');
  }
}
