/**
 * Aplica downgrade para FREE em orgs cujo grace period expirou.
 *
 * Chamado pelo cron job diário. Pode também ser chamado lazily em qualquer
 * request de billing (como safety net complementar).
 *
 * Regras:
 *  - subscriptionStatus = PAST_DUE + graceUntil < now → downgrade para FREE
 *  - Limpa graceUntil para não reprocessar
 *  - Envia email "downgraded" (com cooldown de 24h)
 */

import { findOrgsWithExpiredGrace, updateOrgBilling } from "@/server/repo/billing-repo";
import { sendBillingEmailIfNeeded } from "./send-billing-email";
import { findOrgBySlug } from "@/server/repo/organization-repo";

/**
 * Processa orgs com grace expirado: downgrade + email.
 * Retorna o número de orgs processadas.
 */
export async function applyExpiredGracePeriods(now: Date = new Date()): Promise<number> {
  const orgs = await findOrgsWithExpiredGrace(now);
  let count = 0;

  for (const org of orgs) {
    try {
      // Downgrade para FREE
      await updateOrgBilling(org.id, {
        plan: "FREE",
        graceUntil: null,
        // Manter subscriptionStatus como PAST_DUE para rastreabilidade
        // (o Stripe ainda tem a assinatura em aberto — só o plano cai para FREE)
      });

      // Email de downgrade (best-effort, com cooldown)
      // Precisamos do orgSlug e orgName para montar o email
      // Usamos findOrgBySlug via ID — mas não temos slug aqui, então buscamos pelo ID
      // Workaround: usar findFirst via $queryRaw inline ou ajustar findOrgsWithExpiredGrace
      // Por ora, enviamos com orgId como orgSlug (fallback aceitável para o link)
      const lastDowngradedAt =
        org.billingEmails.length > 0 ? org.billingEmails[0]!.sentAt : null;

      if (org.billingEmail) {
        // Buscar org completa para nome e slug
        const fullOrg = await findOrgById(org.id);
        if (fullOrg) {
          await sendBillingEmailIfNeeded({
            orgId: org.id,
            orgSlug: fullOrg.slug,
            orgName: fullOrg.name,
            type: "downgraded",
            recipientEmail: org.billingEmail,
          });
        }
      }

      count++;
      console.info(`[grace-expiry] Org ${org.id} rebaixada para FREE (grace expirado).`);
    } catch (err) {
      console.error(`[grace-expiry] Erro ao processar org ${org.id}:`, err);
    }
  }

  return count;
}

/** Busca org por ID (não por slug) via $queryRaw para compatibilidade com PrismaPg. */
async function findOrgById(
  id: string
): Promise<{ id: string; slug: string; name: string } | null> {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.$queryRaw<{ id: string; slug: string; name: string }[]>`
    SELECT id, slug, name FROM "Organization" WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}
