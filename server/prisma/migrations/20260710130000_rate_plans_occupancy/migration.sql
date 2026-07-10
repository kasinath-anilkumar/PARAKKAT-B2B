-- v3 §2 — rate plans & occupancy pricing

-- CreateEnum
CREATE TYPE "RatePlanCode" AS ENUM ('EP', 'CP', 'MAP', 'AP');

-- AlterTable: booking rate-plan & occupancy snapshot
ALTER TABLE "Booking"
  ADD COLUMN "ratePlan" "RatePlanCode" NOT NULL DEFAULT 'EP',
  ADD COLUMN "adults" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "children" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "extraBeds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "priceBreakdown" JSONB;

-- CreateTable
CREATE TABLE "RoomTypePricing" (
  "id" TEXT NOT NULL,
  "resortId" TEXT NOT NULL,
  "roomTypeId" TEXT NOT NULL,
  "roomTypeName" TEXT NOT NULL,
  "baseOccupancy" INTEGER NOT NULL DEFAULT 2,
  "maxAdults" INTEGER NOT NULL DEFAULT 3,
  "maxChildren" INTEGER NOT NULL DEFAULT 2,
  "maxOccupancy" INTEGER NOT NULL DEFAULT 4,
  "extraAdultCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "childCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "extraBedCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoomTypePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePlanRate" (
  "id" TEXT NOT NULL,
  "roomTypePricingId" TEXT NOT NULL,
  "plan" "RatePlanCode" NOT NULL,
  "baseRate" DECIMAL(12,2) NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RatePlanRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomTypePricing_resortId_roomTypeId_key" ON "RoomTypePricing"("resortId", "roomTypeId");
CREATE INDEX "RatePlanRate_roomTypePricingId_plan_idx" ON "RatePlanRate"("roomTypePricingId", "plan");

-- AddForeignKey
ALTER TABLE "RatePlanRate" ADD CONSTRAINT "RatePlanRate_roomTypePricingId_fkey" FOREIGN KEY ("roomTypePricingId") REFERENCES "RoomTypePricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
