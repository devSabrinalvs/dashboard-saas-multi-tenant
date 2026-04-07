import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { getStripe } from "@/lib/stripe";
import { findOrgBySlug } from "@/server/repo/organization-repo";

/**
 * POST /api/org/[orgSlug]/billing/portal
 *
 * Cria uma Stripe Customer Portal Session e retorna a URL.
 * Requer que a org já tenha um stripeCustomerId.
 *
 * Usos: gerenciar método de pagamento, cancelar, ver histórico de faturas.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "billing:manage");

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return NextResponse.json({ error: "Org não encontrada" }, { status: 404 });
    }

    if (!org.stripeCustomerId) {
      return NextResponse.json(
        { error: "Esta organização não tem uma assinatura Stripe ativa." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl =
      process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${baseUrl}/org/${orgSlug}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
