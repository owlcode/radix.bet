-- Enhanced Bet Tracking Migration
-- 1. Category system
-- 2. Multi-account linking (UserAccount join table)
-- 3. Vote intent tracking (VoteIntent model)
-- 4. Cleanup: drop phantom fields

-- =============================================================
-- 1. Category model
-- =============================================================
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Category_nameKey_key" ON "Category"("nameKey");

-- Seed system categories
INSERT INTO "Category" ("id", "slug", "nameKey", "isSystem") VALUES
    ('cat_sports',   'sports',   'category.sports',   true),
    ('cat_finance',  'finance',  'category.finance',  true),
    ('cat_politics', 'politics', 'category.politics', true),
    ('cat_weather',  'weather',  'category.weather',  true),
    ('cat_other',    'other',    'category.other',    true);

-- =============================================================
-- 2. Bet: rename category -> categoryId (FK to Category)
-- =============================================================
-- Map existing free-text categories to seeded Category IDs
ALTER TABLE "Bet" ADD COLUMN "categoryId" TEXT;

UPDATE "Bet" SET "categoryId" = CASE
    WHEN LOWER("category") IN ('sports', 'football', 'basketball', 'american-football', 'hockey', 'baseball', 'soccer') THEN 'cat_sports'
    WHEN LOWER("category") IN ('finance', 'crypto') THEN 'cat_finance'
    WHEN LOWER("category") IN ('politics', 'election') THEN 'cat_politics'
    WHEN LOWER("category") IN ('weather') THEN 'cat_weather'
    WHEN "category" IS NOT NULL THEN 'cat_other'
    ELSE NULL
END;

ALTER TABLE "Bet" DROP COLUMN "category";
CREATE INDEX "Bet_categoryId_idx" ON "Bet"("categoryId");
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================
-- 3. RecurringBetTemplate: rename category -> categoryId
-- =============================================================
ALTER TABLE "RecurringBetTemplate" ADD COLUMN "categoryId" TEXT;

UPDATE "RecurringBetTemplate" SET "categoryId" = CASE
    WHEN LOWER("category") IN ('sports', 'football', 'basketball', 'american-football', 'hockey', 'baseball', 'soccer') THEN 'cat_sports'
    WHEN LOWER("category") IN ('finance', 'crypto') THEN 'cat_finance'
    WHEN LOWER("category") IN ('politics', 'election') THEN 'cat_politics'
    WHEN LOWER("category") IN ('weather') THEN 'cat_weather'
    ELSE 'cat_other'
END;

ALTER TABLE "RecurringBetTemplate" DROP COLUMN "category";
CREATE INDEX "RecurringBetTemplate_categoryId_idx" ON "RecurringBetTemplate"("categoryId");
ALTER TABLE "RecurringBetTemplate" ADD CONSTRAINT "RecurringBetTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================
-- 4. BetExtension: rename category -> categoryId
-- =============================================================
ALTER TABLE "BetExtension" ADD COLUMN "categoryId" TEXT;

UPDATE "BetExtension" SET "categoryId" = CASE
    WHEN LOWER("category") IN ('sports', 'football', 'basketball', 'american-football', 'hockey', 'baseball', 'soccer') THEN 'cat_sports'
    WHEN LOWER("category") IN ('finance', 'crypto') THEN 'cat_finance'
    WHEN LOWER("category") IN ('politics', 'election') THEN 'cat_politics'
    WHEN LOWER("category") IN ('weather') THEN 'cat_weather'
    WHEN "category" IS NOT NULL THEN 'cat_other'
    ELSE NULL
END;

ALTER TABLE "BetExtension" DROP COLUMN "category";
CREATE INDEX "BetExtension_categoryId_idx" ON "BetExtension"("categoryId");
ALTER TABLE "BetExtension" ADD CONSTRAINT "BetExtension_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================
-- 5. UserAccount join table (many-to-many User <-> Account)
-- =============================================================
CREATE TABLE "UserAccount" (
    "identityAddress" TEXT NOT NULL,
    "accountAddress" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("identityAddress", "accountAddress")
);
CREATE INDEX "UserAccount_accountAddress_idx" ON "UserAccount"("accountAddress");
ALTER TABLE "UserAccount" ADD CONSTRAINT "UserAccount_identityAddress_fkey" FOREIGN KEY ("identityAddress") REFERENCES "User"("identityAddress") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAccount" ADD CONSTRAINT "UserAccount_accountAddress_fkey" FOREIGN KEY ("accountAddress") REFERENCES "Account"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- Populate from existing Account.userIdentityAddress
INSERT INTO "UserAccount" ("identityAddress", "accountAddress")
SELECT "userIdentityAddress", "address"
FROM "Account"
WHERE "userIdentityAddress" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old FK column from Account
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_userIdentityAddress_fkey";
ALTER TABLE "Account" DROP COLUMN "userIdentityAddress";

-- =============================================================
-- 6. VoteIntent model
-- =============================================================
CREATE TABLE "VoteIntent" (
    "id" TEXT NOT NULL,
    "identityAddress" TEXT NOT NULL,
    "accountAddress" TEXT NOT NULL,
    "componentAddress" TEXT NOT NULL,
    "optionResourceAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "transactionId" TEXT,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoteIntent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VoteIntent_transactionId_key" ON "VoteIntent"("transactionId");
CREATE INDEX "VoteIntent_identityAddress_idx" ON "VoteIntent"("identityAddress");
CREATE INDEX "VoteIntent_componentAddress_idx" ON "VoteIntent"("componentAddress");
CREATE INDEX "VoteIntent_transactionId_idx" ON "VoteIntent"("transactionId");
ALTER TABLE "VoteIntent" ADD CONSTRAINT "VoteIntent_identityAddress_fkey" FOREIGN KEY ("identityAddress") REFERENCES "User"("identityAddress") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================
-- 7. Vote: add voteIntentId FK
-- =============================================================
ALTER TABLE "Vote" ADD COLUMN "voteIntentId" TEXT;
CREATE UNIQUE INDEX "Vote_voteIntentId_key" ON "Vote"("voteIntentId");
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voteIntentId_fkey" FOREIGN KEY ("voteIntentId") REFERENCES "VoteIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old category index that referenced the dropped column
DROP INDEX IF EXISTS "Bet_category_idx";
