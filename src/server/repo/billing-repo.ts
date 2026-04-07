import { prisma } from "@/lib/prisma";
import type { Organization, SubscriptionStatus } from "@/generated/prisma/client";
import type { Plan } from "@/generated/prisma/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrgBillingUpdate = {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  plan?: Plan;
  subscriptionStatus?: SubscriptionStatus | null;
  currentPeriodEnd?: Date | null;
  billingEmail?: string | null;
  planUpdatedAt?: Date;
  /** Grace period: até quando o plano pago é mantido em caso de falha. */
  graceUntil?: Date | null;
  /** True quando a assinatura será cancelada ao fim do período atual. */
  cancelAtPeriodEnd?: boolean;
};

// ─── Organization queries ─────────────────────────────────────────────────────

/**
 * Busca uma organização pelo stripeCustomerId.
 * Usado nos webhooks de assinatura/invoice (que não carregam orgId).
 */
export async function findOrgByStripeCustomerId(
  stripeCustomerId: string
): Promise<Organization | null> {
  return prisma.organization.findFirst({
    where: { stripeCustomerId },
  });
}

/**
 * Atualiza os campos de billing de uma organização.
 * Centraliza todos os updates de billing em um único ponto.
 */
export async function updateOrgBilling(
  orgId: string,
  data: OrgBillingUpdate
): Promise<void> {
  await prisma.organization.updateMany({
    where: { id: orgId },
    data: {
      ...data,
      // Se o plano está sendo alterado, registrar quando
      ...(data.plan !== undefined ? { planUpdatedAt: new Date() } : {}),
    },
  });
}

// ─── Grace period reconciliation ─────────────────────────────────────────────

/** Subset retornado pelo cron para processar grace expirado. */
export type ExpiredGraceOrg = {
  id: string;
  billingEmail: string | null;
  billingEmails: { sentAt: Date }[];
};

/**
 * Busca orgs com PAST_DUE cujo grace period já expirou.
 * Usado pelo cron job de reconciliação.
 *
 * Nota: usamos $queryRaw para contornar a limitação do findMany com PrismaPg.
 */
export async function findOrgsWithExpiredGrace(
  now: Date
): Promise<ExpiredGraceOrg[]> {
  // $queryRaw retorna array de objetos plain — mapeamos manualmente
  const rows = await prisma.$queryRaw<
    { id: string; billingEmail: string | null }[]
  >`
    SELECT id, "billingEmail"
    FROM "Organization"
    WHERE "subscriptionStatus" = 'PAST_DUE'
      AND "graceUntil" IS NOT NULL
      AND "graceUntil" < ${now}
  `;

  // Para cada org, buscar o último email "downgraded" enviado (cooldown)
  const result: ExpiredGraceOrg[] = [];
  for (const row of rows) {
    const emailRecord = await prisma.billingEmailSent.findUnique({
      where: { orgId_type: { orgId: row.id, type: "downgraded" } },
      select: { sentAt: true },
    });
    result.push({
      id: row.id,
      billingEmail: row.billingEmail,
      billingEmails: emailRecord ? [{ sentAt: emailRecord.sentAt }] : [],
    });
  }
  return result;
}

// ─── Webhook idempotency ──────────────────────────────────────────────────────

/**
 * Verifica se um evento Stripe já foi processado.
 * Deve ser chamado antes de qualquer processamento de webhook.
 */
export async function isWebhookEventProcessed(
  stripeEventId: string
): Promise<boolean> {
  const record = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId },
  });
  return record !== null;
}

/**
 * Marca um evento Stripe como processado.
 * Deve ser chamado após processamento bem-sucedido (dentro do mesmo fluxo).
 * Ignora silenciosamente se o evento já foi marcado (idempotente por design).
 */
export async function markWebhookEventProcessed(
  stripeEventId: string
): Promise<void> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { stripeEventId },
    });
  } catch {
    // P2002 = unique constraint — evento já processado por outra instância.
    // Swallow silently: o resultado é o mesmo (idempotência garantida).
  }
}
