import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { getStripe } from "@/lib/stripe";
import { stripePriceIdFromPlan } from "@/billing/stripe-plans";
import { updateOrgBilling } from "@/server/repo/billing-repo";
import { findOrgBySlug } from "@/server/repo/organization-repo";

const checkoutBodySchema = z.object({
  plan: z.enum(["PRO", "BUSINESS"]),
});

/**
 * POST /api/org/[orgSlug]/billing/checkout
 * Body: { plan: "PRO" | "BUSINESS" }
 *
 * Cria (ou reutiliza) um Stripe Customer para a org e
 * retorna uma URL de Checkout Session para redirect.
 *
 * IMPORTANTE: este endpoint APENAS inicia o fluxo.
 * O plan no banco só é atualizado pelo webhook (fonte da verdade).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "billing:manage");

    const body = (await req.json()) as unknown;
    const parsed = checkoutBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { plan } = parsed.data;

    const priceId = stripePriceIdFromPlan(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: `STRIPE_PRICE_ID_${plan} não está configurado.` },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    const baseUrl =
      process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const billingUrl = `${baseUrl}/org/${orgSlug}/settings/billing`;

    // Buscar org para pegar stripeCustomerId atual (se já existe)
    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return NextResponse.json({ error: "Org não encontrada" }, { status: 404 });
    }

    // Criar Customer no Stripe se ainda não existe
    let stripeCustomerId = org.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: ctx.email,
        name: org.name,
        metadata: { orgId: org.id, orgSlug: org.slug },
      });
      stripeCustomerId = customer.id;

      // Salvar imediatamente para evitar duplicatas em caso de retry
      await updateOrgBilling(org.id, {
        stripeCustomerId,
        billingEmail: ctx.email,
      });
    }

    // Criar Checkout Session (modo subscription)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        orgId: org.id,
        orgSlug,
        requestedPlan: plan,
      },
      success_url: `${billingUrl}?status=success`,
      cancel_url: `${billingUrl}?status=canceled`,
      // Permite trocar de plano sem criar nova assinatura se já existe
      subscription_data: {
        metadata: {
          orgId: org.id,
          orgSlug,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Falha ao criar sessão de checkout" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
