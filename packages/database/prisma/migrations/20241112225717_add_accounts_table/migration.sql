-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Account" (
    "address" TEXT NOT NULL,
    "label" TEXT,
    "appereanceId" INTEGER,
    "userIdentityAddress" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("address")
);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userIdentityAddress_fkey" FOREIGN KEY ("userIdentityAddress") REFERENCES "User"("identityAddress") ON DELETE SET NULL ON UPDATE CASCADE;
