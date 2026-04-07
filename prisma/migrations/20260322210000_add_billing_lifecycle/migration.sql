-- Etapa O: Billing lifecycle — grace period, cancel flags, email cooldown

-- AlterTable Organization: adicionar graceUntil e cancelAtPeriodEnd
ALTER TABLE "Organization" ADD COLUMN "graceUntil" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable BillingEmailSent: registro do último email de billing enviado por org+tipo
CREATE TABLE "BillingEmailSent" (
    "id"    TEXT         NOT NULL,
    "orgId" TEXT         NOT NULL,
    "type"  TEXT         NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEmailSent_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: 1 registro por org+tipo (upsert de sentAt)
CREATE UNIQUE INDEX "BillingEmailSent_orgId_type_key" ON "BillingEmailSent"("orgId", "type");

-- Foreign key: BillingEmailSent → Organization (cascade delete)
ALTER TABLE "BillingEmailSent" ADD CONSTRAINT "BillingEmailSent_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
