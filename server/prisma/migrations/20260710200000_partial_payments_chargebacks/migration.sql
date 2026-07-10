-- v3 §5.3 — partial payments, chargebacks & settlement reconciliation.

-- Invoice status can now be PARTIALLY_PAID.
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- A settled inbound payment can be reversed by the gateway (dispute/chargeback).
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CHARGEBACK';

-- CRS ledger event for a reversed payment.
ALTER TYPE "CrsEventType" ADD VALUE IF NOT EXISTS 'CHARGEBACK';

-- Cumulative amount settled against an invoice (supports installments).
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0;
