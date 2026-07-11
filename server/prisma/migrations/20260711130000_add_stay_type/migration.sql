-- CreateEnum
CREATE TYPE "StayType" AS ENUM ('OVERNIGHT', 'DAY_USE');

-- AlterTable: v4 §1 — overnight vs same-day day-use bookings (AxisRooms exposes
-- day-use as a distinct product). Existing rows default to OVERNIGHT.
ALTER TABLE "Booking" ADD COLUMN "stayType" "StayType" NOT NULL DEFAULT 'OVERNIGHT';
