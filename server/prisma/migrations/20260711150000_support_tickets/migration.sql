-- Support ticket system (agency/agent raise; admin responds).
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT,
  "priority" "SupportPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "authorRole" "ActorRole" NOT NULL,
  "body" TEXT NOT NULL,
  "internal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_agencyId_idx" ON "SupportTicket"("agencyId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
