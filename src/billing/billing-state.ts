/**
 * Funções puras para calcular o estado de billing de uma organização.
 *
 * Design: sem IO — recebem dados já lidos e retornam o estado derivado.
 * Isso facilita testes unitários e uso em Server Components sem async.
 */

import type { Plan, SubscriptionStatus } from "@/generated/prisma/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Tipo do banner de billing a ser exibido no AppShell.
 *
 * null = nenhum banner (estado normal ACTIVE).
 */
export type BillingBannerType =
  | "payment_issue_grace"    // PAST_DUE + grace ainda ativo  → warning
  | "payment_issue_expired"  // PAST_DUE + grace expirado     → danger
  | "cancel_pending"         // cancelAtPeriodEnd = true       → info
  | "incomplete"             // INCOMPLETE                     → warning
  | null;

export interface BillingStateResult {
  bannerType: BillingBannerType;
  /** Se há grace ativo, a data limite. Null caso contrário. */
  graceUntil: Date | null;
  /** Data de encerramento do período atual (para "cancela em …"). */
  currentPeriodEnd: Date | null;
}

/** Subset de Organization necessário para computar o estado de billing. */
export interface OrgBillingSnapshot {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus | null;
  graceUntil: Date | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
}

// ─── Grace period ─────────────────────────────────────────────────────────────

/** Duração padrão do grace period após falha de pagamento. */
export const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// ─── Billing email cooldown ───────────────────────────────────────────────────

/** Tipos de email de billing que podem ser enviados. */
export type BillingEmailType =
  | "payment_failed"
  | "subscription_canceled"
  | "downgraded";

/** Cooldown entre emails do mesmo tipo para a mesma org. */
export const BILLING_EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Decide se um email de billing deve ser enviado com base no cooldown.
 *
 * @param lastSentAt - timestamp do último envio (null = nunca enviou)
 * @param now - data de referência (injetável para testes)
 */
export function shouldSendBillingEmail(
  lastSentAt: Date | null,
  now: Date = new Date()
): boolean {
  if (!lastSentAt) return true;
  return now.getTime() - lastSentAt.getTime() >= BILLING_EMAIL_COOLDOWN_MS;
}

// ─── Billing state ────────────────────────────────────────────────────────────

/**
 * Função pura que deriva o estado de billing de uma org.
 *
 * Regras:
 * 1. PAST_DUE + graceUntil futuro  → "payment_issue_grace" (banner warning)
 * 2. PAST_DUE + grace expirado     → "payment_issue_expired" (banner danger)
 * 3. cancelAtPeriodEnd = true       → "cancel_pending" (banner info)
 * 4. INCOMPLETE                     → "incomplete" (banner warning)
 * 5. Qualquer outro caso            → null (sem banner)
 *
 * @param org - snapshot dos campos de billing da org
 * @param now - data de referência (injetável para testes)
 */
export function computeBillingState(
  org: OrgBillingSnapshot,
  now: Date = new Date()
): BillingStateResult {
  // Prioridade 1: PAST_DUE (falha de pagamento)
  if (org.subscriptionStatus === "PAST_DUE") {
    const graceActive = !!org.graceUntil && org.graceUntil > now;
    return {
      bannerType: graceActive ? "payment_issue_grace" : "payment_issue_expired",
      graceUntil: org.graceUntil,
      currentPeriodEnd: org.currentPeriodEnd,
    };
  }

  // Prioridade 2: cancelamento agendado ao fim do período
  if (org.cancelAtPeriodEnd && org.currentPeriodEnd) {
    return {
      bannerType: "cancel_pending",
      graceUntil: null,
      currentPeriodEnd: org.currentPeriodEnd,
    };
  }

  // Prioridade 3: assinatura incompleta
  if (org.subscriptionStatus === "INCOMPLETE") {
    return {
      bannerType: "incomplete",
      graceUntil: null,
      currentPeriodEnd: null,
    };
  }

  // Estado normal
  return {
    bannerType: null,
    graceUntil: null,
    currentPeriodEnd: org.currentPeriodEnd,
  };
}
