-- CreateTable
CREATE TABLE "NotionIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationToken" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "syncInterval" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotionIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotionIntegration_userId_key" ON "NotionIntegration"("userId");

-- CreateIndex
CREATE INDEX "NotionIntegration_userId_enabled_idx" ON "NotionIntegration"("userId", "enabled");

-- AddForeignKey
ALTER TABLE "NotionIntegration" ADD CONSTRAINT "NotionIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
