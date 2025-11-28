-- AlterTable
ALTER TABLE "RFQ" ADD COLUMN     "aiConfidenceScore" DOUBLE PRECISION,
ADD COLUMN     "aiDecisionReason" TEXT,
ADD COLUMN     "autoProcessedAt" TIMESTAMP(3),
ADD COLUMN     "gatekeeperStatus" TEXT,
ADD COLUMN     "riskLevel" TEXT,
ADD COLUMN     "suggestedSuppliers" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "annualRevenue" DOUBLE PRECISION,
ADD COLUMN     "categoryExpertise" TEXT,
ADD COLUMN     "companyAge" INTEGER,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "completedRFQs" INTEGER DEFAULT 0,
ADD COLUMN     "financialScore" INTEGER DEFAULT 75,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "rejectedRFQs" INTEGER DEFAULT 0,
ADD COLUMN     "reputationScore" DOUBLE PRECISION DEFAULT 5.0;

-- CreateTable
CREATE TABLE "GatekeeperLog" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "aiScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "clientReputation" DOUBLE PRECISION,
    "rfqValue" DOUBLE PRECISION,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatekeeperLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GatekeeperLog" ADD CONSTRAINT "GatekeeperLog_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;
