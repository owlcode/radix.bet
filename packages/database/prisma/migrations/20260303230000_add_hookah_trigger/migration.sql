-- CreateTable
CREATE TABLE "HookahTrigger" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "emitterAddress" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HookahTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HookahTrigger_emitterAddress_eventName_key" ON "HookahTrigger"("emitterAddress", "eventName");

-- CreateIndex
CREATE INDEX "HookahTrigger_emitterAddress_idx" ON "HookahTrigger"("emitterAddress");
