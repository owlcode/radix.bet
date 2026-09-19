-- AlterEnum
ALTER TYPE "BetStatus" ADD VALUE 'SETTLED';

-- CreateIndex (make resourceAddress unique so Vote can reference it)
CREATE UNIQUE INDEX "BetOption_resourceAddress_key" ON "BetOption"("resourceAddress");

-- CreateTable
CREATE TABLE "BetExtension" (
    "transactionId" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "slug" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetExtension_pkey" PRIMARY KEY ("transactionId")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "componentAddress" TEXT NOT NULL,
    "optionAddress" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "transactionId" TEXT NOT NULL,
    "stateVersion" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_transactionId_key" ON "Vote"("transactionId");

-- CreateIndex
CREATE INDEX "Vote_componentAddress_idx" ON "Vote"("componentAddress");

-- CreateIndex
CREATE INDEX "Vote_optionAddress_idx" ON "Vote"("optionAddress");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_componentAddress_fkey" FOREIGN KEY ("componentAddress") REFERENCES "Bet"("componentAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_optionAddress_fkey" FOREIGN KEY ("optionAddress") REFERENCES "BetOption"("resourceAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
