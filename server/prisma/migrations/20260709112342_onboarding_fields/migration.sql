-- AlterEnum
ALTER TYPE "ActorRole" ADD VALUE 'APPLICANT';

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_uploadedById_fkey";

-- AlterTable
ALTER TABLE "AgencyApplication" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "businessContactEmail" TEXT,
ADD COLUMN     "businessContactPhone" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'India',
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "resumeTokenHash" TEXT,
ADD COLUMN     "state" TEXT,
ALTER COLUMN "legalName" DROP NOT NULL,
ALTER COLUMN "gstin" DROP NOT NULL,
ALTER COLUMN "pan" DROP NOT NULL,
ALTER COLUMN "repName" DROP NOT NULL,
ALTER COLUMN "repDesignation" DROP NOT NULL,
ALTER COLUMN "repEmail" DROP NOT NULL,
ALTER COLUMN "repMobile" DROP NOT NULL,
ALTER COLUMN "bankAccount" DROP NOT NULL,
ALTER COLUMN "ifsc" DROP NOT NULL,
ALTER COLUMN "accountHolder" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "fileName" TEXT,
ALTER COLUMN "uploadedById" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AgencyApplication_gstin_idx" ON "AgencyApplication"("gstin");

-- CreateIndex
CREATE INDEX "AgencyApplication_pan_idx" ON "AgencyApplication"("pan");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

