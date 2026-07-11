-- In-app notification inbox (persisted centrally when notify() emits).
CREATE TYPE "NotificationAudience" AS ENUM ('AGENCY', 'ADMIN');

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "audience" "NotificationAudience" NOT NULL,
  "agencyId" TEXT,
  "event" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_agencyId_read_idx" ON "Notification"("agencyId", "read");
CREATE INDEX "Notification_audience_read_idx" ON "Notification"("audience", "read");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
