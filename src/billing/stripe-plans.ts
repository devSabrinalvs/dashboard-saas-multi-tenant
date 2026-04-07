import type { Plan } from "@/generated/prisma/enums";

/**
 * Mapeia um Stripe Price ID para um Plan da aplicação.
 *
 * Usa variáveis de ambiente para desacoplar o código dos IDs reais do Stripe,
 * permitindo usar price IDs diferentes em dev/staging/prod.
 *
 * Retorna null se o priceId não corresponder a nenhum plano pago —
 * o caller decide se isso significa FREE ou um erro.
 *
 * @example
 * planFromStripePriceId(process.env.STRIPE_PRICE_ID_PRO!) // → "PRO"
 * planFromStripePriceId("price_unknown")                   // → null
 */
export function planFromStripePriceId(priceId: string): Plan | null {
  const proPriceId = process.env.STRIPE_PRICE_ID_PRO;
  const businessPriceId = process.env.STRIPE_PRICE_ID_BUSINESS;

  if (proPriceId && priceId === proPriceId) return "PRO";
  if (businessPriceId && priceId === businessPriceId) return "BUSINESS";

  return null;
}

/**
 * Mapeia um Plan para o Stripe Price ID correspondente.
 * Usado na criação do Checkout Session para selecionar o produto correto.
 *
 * Retorna null para FREE (sem assinatura Stripe).
 */
export function stripePriceIdFromPlan(plan: Plan): string | null {
  switch (plan) {
    case "PRO":
      return process.env.STRIPE_PRICE_ID_PRO ?? null;
    case "BUSINESS":
      return process.env.STRIPE_PRICE_ID_BUSINESS ?? null;
    case "FREE":
      return null;
  }
}
