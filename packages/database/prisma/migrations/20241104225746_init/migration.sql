-- CreateTable
CREATE TABLE "User" (
    "identityAddress" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("identityAddress")
);

-- CreateTable
CREATE TABLE "Bet" (
    "componentAddress" TEXT NOT NULL,
    "userIdentityAddress" TEXT NOT NULL,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("componentAddress")
);

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userIdentityAddress_fkey" FOREIGN KEY ("userIdentityAddress") REFERENCES "User"("identityAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
