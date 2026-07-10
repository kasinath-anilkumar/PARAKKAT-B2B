-- Targeted indexes for hot query paths (dashboard aggregates, cancellations).
CREATE INDEX "Payment_direction_status_completedAt_idx" ON "Payment"("direction", "status", "completedAt");
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");
CREATE INDEX "Invoice_status_paymentMode_idx" ON "Invoice"("status", "paymentMode");
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");
