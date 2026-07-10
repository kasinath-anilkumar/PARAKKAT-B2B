-- CreateEnum
CREATE TYPE "BookingState" AS ENUM ('DRAFT', 'AWAITING_PAYMENT', 'CONFIRMED_ON_CREDIT', 'PAID', 'CONFIRMED', 'COMMITTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "resortId" TEXT NOT NULL,
    "resortName" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomTypeName" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL,
    "guests" INTEGER NOT NULL,
    "baseRate" DECIMAL(14,2) NOT NULL,
    "agencyPrice" DECIMAL(14,2) NOT NULL,
    "markupPct" DECIMAL(5,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "state" "BookingState" NOT NULL DEFAULT 'DRAFT',
    "holdExpiresAt" TIMESTAMP(3),
    "axisRoomsRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "committedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_correlationId_key" ON "Booking"("correlationId");

-- CreateIndex
CREATE INDEX "Booking_agencyId_idx" ON "Booking"("agencyId");

-- CreateIndex
CREATE INDEX "Booking_agentId_idx" ON "Booking"("agentId");

-- CreateIndex
CREATE INDEX "Booking_state_idx" ON "Booking"("state");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

