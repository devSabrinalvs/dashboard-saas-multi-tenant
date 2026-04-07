/**
 * Repositório para BillingEmailSent — cooldown de emails de billing.
 *
 * Cada registro armazena o timestamp do último envio por org+tipo.
 * Unique constraint (orgId, type) garante 1 registro por combinação.
 */

import { prisma } from "@/lib/prisma";
import type { BillingEmailType } from "@/billing/billing-state";

/**
 * Retorna o timestamp do último email de billing enviado para essa org+tipo.
 * null = nunca enviou.
 */
export async function getLastBillingEmailSent(
  orgId: string,
  type: BillingEmailType
): Promise<Date | null> {
  const record = await prisma.billingEmailSent.findUnique({
    where: { orgId_type: { orgId, type } },
    select: { sentAt: true },
  });
  return record?.sentAt ?? null;
}

/**
 * Registra (ou atualiza) o timestamp do último email enviado para org+tipo.
 * Usa upsert para garantir idempotência.
 */
export async function upsertBillingEmailSent(
  orgId: string,
  type: BillingEmailType,
  sentAt: Date = new Date()
): Promise<void> {
  await prisma.billingEmailSent.upsert({
    where: { orgId_type: { orgId, type } },
    create: { orgId, type, sentAt },
    update: { sentAt },
  });
}
