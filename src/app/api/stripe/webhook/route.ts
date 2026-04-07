import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { parseStripeEvent } from "@/server/use-cases/stripe/apply-stripe-event";
import {
  findOrgByStripeCustomerId,
  isWebhookEventProcessed,
  markWebhookEventProcessed,
  updateOrgBilling,
} from "@/server/repo/billing-repo";
import { sendBillingEmailIfNeeded } from "@/server/use-cases/billing/send-billing-email";
import { GRACE_PERIOD_MS } from "@/billing/billing-state";
import { findOrgBySlug } from "@/server/repo/organization-repo";

/**
 * POST /api/stripe/webhook
 *
 * Endpoint de webhooks do Stripe — fonte da verdade para atualizações de plano.
 *
 * Segurança:
 *  - Lê o body RAW (req.text()) — obrigatório para verificação de assinatura.
 *  - Verifica Stripe-Signature com STRIPE_WEBHOOK_SECRET.
 *  - Usa tabela StripeWebhookEvent para idempotência (nunca processa 2x).
 *
 * Eventos tratados:
 *  - checkout.session.completed
 *  - customer.subscription.created / updated / deleted
 *  - invoice.paid / invoice.payment_failed
 */
export async function POST(req: Request) {
  // 1. Ler body RAW — NUNCA usar req.json() antes deste passo
  const rawBody = await req.text();

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Assinatura Stripe ausente" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET não configurado");
    return NextResponse.json(
      { error: "Webhook não configurado" },
      { status: 500 }
    );
  }

  // 2. Verificar assinatura (lança se inválida)
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[stripe/webhook] Assinatura inválida:", message);
    return NextResponse.json(
      { error: "Assinatura inválida" },
      { status: 400 }
    );
  }

  // 3. Idempotência — ignorar eventos já processados
  const alreadyProcessed = await isWebhookEventProcessed(event.id);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: true });
  }

  // 4. Parsear evento → resolver + update
  const parsed = parseStripeEvent(event);
  if (parsed === null) {
    // Evento não tratado — retornar 200 para não gerar retries desnecessários
    await markWebhookEventProcessed(event.id);
    return NextResponse.json({ received: true });
  }

  // 5. Encontrar a org no DB
  let orgId: string | null = null;
  let existingOrg: Awaited<ReturnType<typeof findOrgByStripeCustomerId>> = null;

  if (parsed.resolver.by === "orgId") {
    orgId = parsed.resolver.orgId;
  } else {
    existingOrg = await findOrgByStripeCustomerId(parsed.resolver.stripeCustomerId);
    orgId = existingOrg?.id ?? null;
  }

  if (!orgId) {
    console.warn(
      `[stripe/webhook] Org não encontrada para evento ${event.type} (${event.id})`
    );
    await markWebhookEventProcessed(event.id);
    return NextResponse.json({ received: true });
  }

  // 6. Calcular side-effects de lifecycle (grace period, emails)
  const finalUpdate = { ...parsed.update };
  const now = new Date();

  if (event.type === "invoice.payment_failed") {
    // Definir grace period apenas se ainda não existir
    const graceAlreadySet = !!existingOrg?.graceUntil;
    if (!graceAlreadySet) {
      finalUpdate.graceUntil = new Date(now.getTime() + GRACE_PERIOD_MS);
    }
  }

  // 7. Aplicar update no banco
  await updateOrgBilling(orgId, finalUpdate);

  // 8. Marcar evento como processado
  await markWebhookEventProcessed(event.id);

  // 9. Side-effects: emails de billing (best-effort, após commit)
  void triggerBillingEmails(event, orgId, existingOrg, finalUpdate.graceUntil ?? existingOrg?.graceUntil ?? null);

  console.info(`[stripe/webhook] ${event.type} processado para org ${orgId}`);

  return NextResponse.json({ received: true });
}

// ─── Email side-effects ───────────────────────────────────────────────────────

async function triggerBillingEmails(
  event: Stripe.Event,
  orgId: string,
  existingOrg: { id: string; slug: string; name: string; billingEmail: string | null } | null,
  graceUntil: Date | null
): Promise<void> {
  try {
    // Precisamos de slug + name para montar o email
    let org = existingOrg;
    if (!org) {
      // Para resolver by orgId (checkout.session.completed), buscar a org pelo id
      const { prisma } = await import("@/lib/prisma");
      const rows = await prisma.$queryRaw<{ id: string; slug: string; name: string; billingEmail: string | null }[]>`
        SELECT id, slug, name, "billingEmail" FROM "Organization" WHERE id = ${orgId} LIMIT 1
      `;
      org = rows[0] ?? null;
    }

    if (!org?.billingEmail) return; // sem email de billing configurado

    if (event.type === "invoice.payment_failed" && graceUntil) {
      await sendBillingEmailIfNeeded({
        orgId,
        orgSlug: org.slug,
        orgName: org.name,
        type: "payment_failed",
        recipientEmail: org.billingEmail,
        graceUntil,
      });
    }

    if (event.type === "customer.subscription.deleted") {
      await sendBillingEmailIfNeeded({
        orgId,
        orgSlug: org.slug,
        orgName: org.name,
        type: "subscription_canceled",
        recipientEmail: org.billingEmail,
      });
    }

    if (event.type === "customer.subscription.updated") {
      // cancel_at_period_end → email de cancelamento agendado
      const sub = event.data.object as Stripe.Subscription;
      if (sub.cancel_at_period_end && sub.cancel_at) {
        await sendBillingEmailIfNeeded({
          orgId,
          orgSlug: org.slug,
          orgName: org.name,
          type: "subscription_canceled",
          recipientEmail: org.billingEmail,
          cancelDate: new Date(sub.cancel_at * 1000),
        });
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] Falha no side-effect de email:", err);
  }
}
