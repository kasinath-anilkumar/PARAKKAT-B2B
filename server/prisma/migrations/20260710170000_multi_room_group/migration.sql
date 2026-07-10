-- v3 §4 — group multi-room booking lines under a shared groupId.
ALTER TABLE "Booking" ADD COLUMN "groupId" TEXT;
CREATE INDEX "Booking_groupId_idx" ON "Booking"("groupId");
