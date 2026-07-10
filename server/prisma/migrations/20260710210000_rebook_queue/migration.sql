-- v3 §5.2 — commit-failure / rebook queue.

-- New booking state for portal-accepted-but-uncommitted reservations.
ALTER TYPE "BookingState" ADD VALUE IF NOT EXISTS 'COMMIT_FAILED';

-- Rebook task lifecycle.
DO $$ BEGIN
  CREATE TYPE "RebookTaskStatus" AS ENUM ('PENDING', 'RESOLVED', 'ABANDONED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Rebook queue.
CREATE TABLE IF NOT EXISTS "RebookTask" (
  "id"         TEXT NOT NULL,
  "bookingId"  TEXT NOT NULL,
  "status"     "RebookTaskStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"   INTEGER NOT NULL DEFAULT 0,
  "lastError"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "RebookTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RebookTask_bookingId_key" ON "RebookTask"("bookingId");
CREATE INDEX IF NOT EXISTS "RebookTask_status_idx" ON "RebookTask"("status");

ALTER TABLE "RebookTask"
  ADD CONSTRAINT "RebookTask_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
