-- CreateEnum
CREATE TYPE "OracleGameStatus" AS ENUM ('DISCOVERED', 'BET_CREATED', 'BET_FAILED', 'RESOLVED', 'RESOLUTION_FAILED');

-- CreateTable
CREATE TABLE "OracleGame" (
    "id" TEXT NOT NULL,
    "espnEventId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeTeamLogo" TEXT,
    "awayTeamLogo" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "status" "OracleGameStatus" NOT NULL DEFAULT 'DISCOVERED',
    "betComponentAddress" TEXT,
    "ownerBadgeAddress" TEXT,
    "transactionId" TEXT,
    "resolveTransactionId" TEXT,
    "winnerTeam" TEXT,
    "oracleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OracleGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamImage" (
    "id" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OracleGame_espnEventId_oracleId_key" ON "OracleGame"("espnEventId", "oracleId");

-- CreateIndex
CREATE INDEX "OracleGame_status_oracleId_idx" ON "OracleGame"("status", "oracleId");

-- CreateIndex
CREATE INDEX "OracleGame_startTime_idx" ON "OracleGame"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "TeamImage_teamName_key" ON "TeamImage"("teamName");
