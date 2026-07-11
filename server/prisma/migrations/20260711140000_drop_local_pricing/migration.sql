-- v4 §1 — rate plans, per-date rates, occupancy and restrictions now come from
-- AxisRooms (source of truth). The portal-managed pricing tables are orphaned
-- (no code reads them; no live data references them) — drop them. The
-- RatePlanCode enum is retained (Booking.ratePlan still uses it).
DROP TABLE IF EXISTS "RatePlanRate";
DROP TABLE IF EXISTS "RoomTypePricing";
