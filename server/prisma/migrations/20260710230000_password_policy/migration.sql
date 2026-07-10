-- v3 §10.2 — force a password change after a temporary/admin-set password.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
