-- CreateTable
CREATE TABLE "UserSessionMeta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceLabel" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserSessionMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSessionMeta_sessionId_key" ON "UserSessionMeta"("sessionId");

-- CreateIndex
CREATE INDEX "UserSessionMeta_userId_revokedAt_idx" ON "UserSessionMeta"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "UserSessionMeta" ADD CONSTRAINT "UserSessionMeta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
