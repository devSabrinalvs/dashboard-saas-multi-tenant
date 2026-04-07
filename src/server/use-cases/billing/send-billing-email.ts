/**
 * Envia um email de billing para a org, respeitando o cooldown de 24h.
 *
 * Fluxo:
 *  1. Verificar se o cooldown (24h) já passou desde o último envio.
 *  2. Se sim, enviar email e registrar o timestamp de envio.
 *  3. Se não, ignorar silenciosamente.
 *
 * Design: best-effort — nunca lança exceção que interrompa o webhook handler.
 */

import { getMailer } from "@/server/email/mailer";
import {
  getLastBillingEmailSent,
  upsertBillingEmailSent,
} from "@/server/repo/billing-email-repo";
import {
  shouldSendBillingEmail,
  type BillingEmailType,
} from "@/billing/billing-state";

const BASE_URL =
  process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function billingUrl(orgSlug: string): string {
  return `${BASE_URL}/org/${orgSlug}/settings/billing`;
}

export async function sendBillingEmailIfNeeded(params: {
  orgId: string;
  orgSlug: string;
  orgName: string;
  type: BillingEmailType;
  recipientEmail: string | null;
  /** Apenas para payment_failed */
  graceUntil?: Date;
  /** Apenas para subscription_canceled */
  cancelDate?: Date;
}): Promise<void> {
  const { orgId, orgSlug, orgName, type, recipientEmail } = params;

  if (!recipientEmail) return; // Sem email de billing → silencioso

  try {
    const lastSentAt = await getLastBillingEmailSent(orgId, type);
    if (!shouldSendBillingEmail(lastSentAt)) return; // cooldown ativo

    const mailer = getMailer();
    const url = billingUrl(orgSlug);

    switch (type) {
      case "payment_failed":
        if (!params.graceUntil) return;
        await mailer.sendPaymentFailedEmail({
          to: recipientEmail,
          orgName,
          billingUrl: url,
          graceUntil: params.graceUntil,
        });
        break;
      case "subscription_canceled":
        if (!params.cancelDate) return;
        await mailer.sendSubscriptionCanceledEmail({
          to: recipientEmail,
          orgName,
          cancelDate: params.cancelDate,
          billingUrl: url,
        });
        break;
      case "downgraded":
        await mailer.sendDowngradedEmail({
          to: recipientEmail,
          orgName,
          billingUrl: url,
        });
        break;
    }

    await upsertBillingEmailSent(orgId, type);
  } catch (err) {
    // Best-effort: nunca interromper o fluxo principal por falha de email
    console.error(`[billing-email] Falha ao enviar ${type} para org ${orgId}:`, err);
  }
}
