import type Stripe from "stripe";
import type { SubscriptionStatus } from "@/generated/prisma/client";
import type { Plan } from "@/generated/prisma/enums";
import { planFromStripePriceId } from "@/billing/stripe-plans";
import type { OrgBillingUpdate } from "@/server/repo/billing-repo";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Descreve como encontrar a organização afetada pelo evento.
 * O webhook handler usa isso para fazer o lookup no DB antes de aplicar o update.
 */
export type StripeEventOrgResolver =
  | { by: "orgId"; orgId: string }
  | { by: "stripeCustomerId"; stripeCustomerId: string };

/**
 * Resultado do parsing de um evento Stripe.
 * null = evento não tratado / ignorar.
 */
export type ParsedStripeEvent = {
  resolver: StripeEventOrgResolver;
  update: OrgBillingUpdate;
} | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converte o status de assinatura do Stripe para o enum interno.
 * Retorna null para statuses desconhecidos (ignorar silenciosamente).
 */
export function stripeStatusToSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus | null {
  const map: Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    trialing: "TRIALING",
    // incomplete_expired, paused → null (tratados como CANCELED ou ignorados)
  };
  return map[status] ?? null;
}

/**
 * Extrai o primeiro priceId de uma assinatura Stripe.
 * Retorna null se não houver items (não deveria acontecer, mas defensivo).
 */
function extractPriceId(
  subscription: Stripe.Subscription
): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

/**
 * Extrai o customerId como string (pode vir como string ou objeto expandido).
 */
function extractCustomerId(
  customerId: string | Stripe.Customer | Stripe.DeletedCustomer
): string {
  return typeof customerId === "string" ? customerId : customerId.id;
}

// ─── Core parse function ──────────────────────────────────────────────────────

/**
 * Função PURA: analisa um evento Stripe e retorna o que deve ser atualizado
 * no banco de dados, sem fazer nenhuma chamada IO.
 *
 * O webhook handler é responsável por:
 *  1. Chamar esta função com o evento verificado.
 *  2. Usar o `resolver` para encontrar a org no DB.
 *  3. Chamar `updateOrgBilling` com o `update` resultante.
 *
 * Design rationale: função pura facilita testes unitários sem mocks de DB.
 */
export function parseStripeEvent(
  event: Stripe.Event
): ParsedStripeEvent {
  switch (event.type) {
    // ── Checkout completado ───────────────────────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const orgId = session.metadata?.orgId;
      if (!orgId) return null; // sessão sem orgId não é nossa

      const stripeCustomerId =
        typeof session.customer === "string" ? session.customer : null;
      const stripeSubscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      return {
        resolver: { by: "orgId", orgId },
        update: {
          ...(stripeCustomerId ? { stripeCustomerId } : {}),
          ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
          // plano e status serão definidos pelos eventos de subscription que seguem
        },
      };
    }

    // ── Assinatura criada ou atualizada ───────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;

      const stripeCustomerId = extractCustomerId(subscription.customer);
      const priceId = extractPriceId(subscription);
      const plan: Plan = priceId
        ? (planFromStripePriceId(priceId) ?? "FREE")
        : "FREE";
      const subscriptionStatus = stripeStatusToSubscriptionStatus(subscription.status);

      // cancel_at_period_end: assinatura vai cancelar ao fim do período
      const cancelAtPeriodEnd = subscription.cancel_at_period_end;
      // cancel_at é definido pelo Stripe quando cancel_at_period_end = true
      const currentPeriodEnd =
        cancelAtPeriodEnd && subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null;

      return {
        resolver: { by: "stripeCustomerId", stripeCustomerId },
        update: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          plan,
          subscriptionStatus,
          cancelAtPeriodEnd,
          currentPeriodEnd,
        },
      };
    }

    // ── Assinatura cancelada ──────────────────────────────────────────────────
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = extractCustomerId(subscription.customer);

      return {
        resolver: { by: "stripeCustomerId", stripeCustomerId },
        update: {
          plan: "FREE",
          subscriptionStatus: "CANCELED",
          stripeSubscriptionId: null,
          stripePriceId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          graceUntil: null,
        },
      };
    }

    // ── Pagamento de invoice bem-sucedido ─────────────────────────────────────
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = extractCustomerId(invoice.customer!);

      return {
        resolver: { by: "stripeCustomerId", stripeCustomerId },
        // Limpar grace period: pagamento resolvido
        update: { subscriptionStatus: "ACTIVE", graceUntil: null },
      };
    }

    // ── Falha no pagamento ────────────────────────────────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = extractCustomerId(invoice.customer!);

      return {
        resolver: { by: "stripeCustomerId", stripeCustomerId },
        update: { subscriptionStatus: "PAST_DUE" },
      };
    }

    default:
      return null; // evento não tratado — ignorar
  }
}
