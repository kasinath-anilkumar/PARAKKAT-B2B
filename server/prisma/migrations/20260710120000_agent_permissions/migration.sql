-- AlterTable: sub-agent display name + capability flags
ALTER TABLE "User"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "canBook" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canCancel" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canModify" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canViewReports" BOOLEAN NOT NULL DEFAULT true;
