-- v3 §8 — guest data on a booking line (DPDP: only masked ID last-4 retained).
ALTER TABLE "Booking"
  ADD COLUMN "leadGuestName" TEXT,
  ADD COLUMN "leadGuestPhone" TEXT,
  ADD COLUMN "leadGuestEmail" TEXT,
  ADD COLUMN "specialRequests" TEXT,
  ADD COLUMN "guestIdType" TEXT,
  ADD COLUMN "guestIdLast4" TEXT,
  ADD COLUMN "roomingList" JSONB;
