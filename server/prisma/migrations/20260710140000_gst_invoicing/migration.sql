-- v3 §6.1/§6.4 — GST tax invoice + credit notes

-- AlterTable: GST fields on Invoice
ALTER TABLE "Invoice"
  ADD COLUMN "gstRate" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sac" TEXT NOT NULL DEFAULT '996311',
  ADD COLUMN "placeOfSupply" TEXT,
  ADD COLUMN "supplierGstin" TEXT,
  ADD COLUMN "recipientGstin" TEXT,
  ADD COLUMN "cgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "sgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "igst" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "invoiceTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "irn" TEXT;

-- CreateTable
CREATE TABLE "CreditNote" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "taxableValue" DECIMAL(14,2) NOT NULL,
  "gstRate" INTEGER NOT NULL DEFAULT 0,
  "cgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "sgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "igst" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL,
  "irn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_number_key" ON "CreditNote"("number");
CREATE INDEX "CreditNote_agencyId_idx" ON "CreditNote"("agencyId");

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
