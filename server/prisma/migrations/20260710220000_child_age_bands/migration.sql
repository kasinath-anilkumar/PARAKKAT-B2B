-- v3 §2.2 — child age bands for occupancy pricing.
-- [{ "minAge": n, "maxAge": n, "charge": n }] per night; falls back to the flat
-- childCharge when null/empty.
ALTER TABLE "RoomTypePricing" ADD COLUMN IF NOT EXISTS "childBands" JSONB;
