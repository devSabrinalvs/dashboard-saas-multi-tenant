import Stripe from "stripe";

/**
 * Versão estável da API Stripe utilizada em todo o projeto.
 * Centralizar aqui evita divergências entre endpoints e webhook handler.
 */
export const STRIPE_API_VERSION = "2026-02-25.clover" as const;

let _stripe: Stripe | null = null;

/**
 * Retorna o singleton do cliente Stripe (inicialização lazy).
 *
 * Lança um erro claro se STRIPE_SECRET_KEY não estiver configurada,
 * em vez de deixar o erro surgir em runtime na primeira chamada à API.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY não está configurada. " +
          "Adicione ao .env.local (dev) ou às variáveis de ambiente do servidor (prod)."
      );
    }
    _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  }
  return _stripe;
}
