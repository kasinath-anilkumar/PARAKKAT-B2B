import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { getAxisRooms } from '../../lib/axisrooms';
import type { AvailabilityQuery, Resort, RoomTypeAvailability } from '../../lib/axisrooms';
import { TtlCache } from '../../lib/axisrooms/cache';
import { ApiError } from '../../utils/apiError';
import { computeAgencyPrice, nightsBetween } from '../booking/pricing';

// Short-TTL cache for availability reads (§10). Bypassed by the booking path's
// refresh-before-book fresh read.
const availabilityCache = new TtlCache<RoomTypeAvailability[]>(
  env.AVAILABILITY_CACHE_TTL_SECONDS * 1000,
);

export async function listResorts(): Promise<Resort[]> {
  return getAxisRooms().listResorts();
}

export interface PricedRoomType {
  roomTypeId: string;
  roomTypeName: string;
  maxOccupancy: number;
  availableCount: number;
  nights: number;
  // Only the AGENCY price is exposed — base rate (company margin) and the
  // customer price are never surfaced to the agent (§9).
  agencyPricePerNight: number;
  agencyPriceTotal: number;
}

export async function searchAvailability(
  query: AvailabilityQuery,
  agencyId: string,
): Promise<PricedRoomType[]> {
  const config = await prisma.commercialConfiguration.findFirst({
    where: { agencyId, isCurrent: true },
  });
  if (!config) throw ApiError.conflict('Agency has no commercial configuration');
  const markupPct = Number(config.markupPct);

  const nights = nightsBetween(new Date(query.checkIn), new Date(query.checkOut));
  if (nights <= 0) throw ApiError.badRequest('Check-out must be after check-in');

  const key = `${query.resortId}:${query.checkIn}:${query.checkOut}:${query.guests}`;
  let rooms = availabilityCache.get(key);
  if (!rooms) {
    rooms = await getAxisRooms().searchAvailability(query);
    availabilityCache.set(key, rooms);
  }

  return rooms.map((rt) => ({
    roomTypeId: rt.roomTypeId,
    roomTypeName: rt.roomTypeName,
    maxOccupancy: rt.maxOccupancy,
    availableCount: rt.availableCount,
    nights,
    agencyPricePerNight: computeAgencyPrice(rt.baseRatePerNight, 1, markupPct).agencyPrice,
    agencyPriceTotal: computeAgencyPrice(rt.baseRatePerNight, nights, markupPct).agencyPrice,
  }));
}
