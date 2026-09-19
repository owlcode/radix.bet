/*
  Warnings:

  - Added the required column `deadline` to the `Bet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Bet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Bet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('ACTIVE', 'VOTING_CLOSED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- AlterTable (use defaults for NOT NULL columns to handle existing rows)
ALTER TABLE "Bet" ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deadline" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "recurringTemplateId" TEXT,
ADD COLUMN     "secondVerifier" TEXT,
ADD COLUMN     "status" "BetStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verifierType" TEXT NOT NULL DEFAULT 'single',
ADD COLUMN     "winningOptionId" INTEGER;

-- CreateTable
CREATE TABLE "BetOption" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "componentAddress" TEXT NOT NULL,
    "resourceAddress" TEXT NOT NULL,
    "totalVotes" TEXT NOT NULL DEFAULT '0',

    CONSTRAINT "BetOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "transactionId" TEXT,
    "stateVersion" BIGINT,
    "componentAddress" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EventStatus" NOT NULL DEFAULT 'PROCESSED',
    "errorMessage" TEXT,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RecurringBetTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "options" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL,
    "scheduleDay" INTEGER,
    "scheduleTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "deadlineOffsetHours" INTEGER NOT NULL DEFAULT 24,
    "userIdentityAddress" TEXT NOT NULL,
    "subintentSignature" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "maxRuns" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "componentAddress" TEXT NOT NULL,
    "userIdentityAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifierVote" (
    "id" TEXT NOT NULL,
    "componentAddress" TEXT NOT NULL,
    "optionResource" TEXT NOT NULL,
    "voterNftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifierVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventLog_eventType_idx" ON "EventLog"("eventType");

-- CreateIndex
CREATE INDEX "EventLog_transactionId_idx" ON "EventLog"("transactionId");

-- CreateIndex
CREATE INDEX "EventLog_stateVersion_idx" ON "EventLog"("stateVersion");

-- CreateIndex
CREATE INDEX "EventLog_componentAddress_idx" ON "EventLog"("componentAddress");

-- CreateIndex
CREATE INDEX "EventLog_processedAt_idx" ON "EventLog"("processedAt");

-- CreateIndex
CREATE INDEX "RecurringBetTemplate_userIdentityAddress_idx" ON "RecurringBetTemplate"("userIdentityAddress");

-- CreateIndex
CREATE INDEX "RecurringBetTemplate_isActive_idx" ON "RecurringBetTemplate"("isActive");

-- CreateIndex
CREATE INDEX "RecurringBetTemplate_nextRunAt_idx" ON "RecurringBetTemplate"("nextRunAt");

-- CreateIndex
CREATE INDEX "Comment_componentAddress_idx" ON "Comment"("componentAddress");

-- CreateIndex
CREATE INDEX "Comment_userIdentityAddress_idx" ON "Comment"("userIdentityAddress");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "VerifierVote_componentAddress_idx" ON "VerifierVote"("componentAddress");

-- CreateIndex
CREATE UNIQUE INDEX "VerifierVote_componentAddress_voterNftId_key" ON "VerifierVote"("componentAddress", "voterNftId");

-- CreateIndex
CREATE INDEX "Bet_category_idx" ON "Bet"("category");

-- CreateIndex
CREATE INDEX "Bet_userIdentityAddress_idx" ON "Bet"("userIdentityAddress");

-- CreateIndex
CREATE INDEX "Bet_createdAt_idx" ON "Bet"("createdAt");

-- CreateIndex
CREATE INDEX "Bet_status_idx" ON "Bet"("status");

-- CreateIndex
CREATE INDEX "Bet_recurringTemplateId_idx" ON "Bet"("recurringTemplateId");

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringBetTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetOption" ADD CONSTRAINT "BetOption_componentAddress_fkey" FOREIGN KEY ("componentAddress") REFERENCES "Bet"("componentAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_componentAddress_fkey" FOREIGN KEY ("componentAddress") REFERENCES "Bet"("componentAddress") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBetTemplate" ADD CONSTRAINT "RecurringBetTemplate_userIdentityAddress_fkey" FOREIGN KEY ("userIdentityAddress") REFERENCES "User"("identityAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_componentAddress_fkey" FOREIGN KEY ("componentAddress") REFERENCES "Bet"("componentAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userIdentityAddress_fkey" FOREIGN KEY ("userIdentityAddress") REFERENCES "User"("identityAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifierVote" ADD CONSTRAINT "VerifierVote_componentAddress_fkey" FOREIGN KEY ("componentAddress") REFERENCES "Bet"("componentAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
