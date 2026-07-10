-- v3 §3/§4.2 — B2B channel inventory control.

-- CreateEnum
CREATE TYPE "ChannelPolicyKind" AS ENUM ('STOP_SELL', 'CAP');

-- CreateTable
CREATE TABLE "ChannelPolicy" (
  "id" TEXT NOT NULL,
  "resortId" TEXT NOT NULL,
  "roomTypeId" TEXT,
  "kind" "ChannelPolicyKind" NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "capPerDay" INTEGER,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChannelPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allotment" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "resortId" TEXT NOT NULL,
  "roomTypeId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "rooms" INTEGER NOT NULL,
  "releaseDate" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Allotment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelPolicy_resortId_roomTypeId_idx" ON "ChannelPolicy"("resortId", "roomTypeId");
CREATE INDEX "Allotment_agencyId_idx" ON "Allotment"("agencyId");
CREATE INDEX "Allotment_resortId_roomTypeId_idx" ON "Allotment"("resortId", "roomTypeId");

-- AddForeignKey
ALTER TABLE "Allotment" ADD CONSTRAINT "Allotment_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
