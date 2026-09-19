-- AlterTable
ALTER TABLE "Bet" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Bet_slug_key" ON "Bet"("slug");

-- AlterTable (safe: column may already exist if previous migration was applied after edit)
ALTER TABLE "OracleGame" ADD COLUMN IF NOT EXISTS "ownerBadgeAddress" TEXT;
