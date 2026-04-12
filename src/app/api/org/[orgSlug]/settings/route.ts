import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateOrgSchema = z.object({
  name: z.string().min(2).max(80).trim().optional(),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Slug: apenas letras minúsculas, números e hífens")
    .optional(),
});

/**
 * GET  /api/org/[orgSlug]/settings  — Retorna dados básicos da org
 * PATCH /api/org/[orgSlug]/settings — Atualiza nome e/ou slug (OWNER only)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { id: true, name: true, slug: true, createdAt: true, plan: true },
  });

  return NextResponse.json({ org });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "billing:manage"); // OWNER only

  const body = await req.json();
  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 422 });
  }

  if (!parsed.data.name && !parsed.data.slug) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  // Check slug uniqueness
  if (parsed.data.slug && parsed.data.slug !== orgSlug) {
    const existing = await prisma.organization.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) {
      return NextResponse.json({ error: "Este slug já está em uso." }, { status: 409 });
    }
  }

  const updated = await prisma.organization.update({
    where: { id: ctx.orgId },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
    },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ org: updated });
}

/**
 * DELETE /api/org/[orgSlug]/settings — Deleta a organização (OWNER only)
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "billing:manage"); // OWNER only

  // Safety: cannot delete if active Stripe subscription
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { subscriptionStatus: true, stripeSubscriptionId: true },
  });

  if (org?.subscriptionStatus === "ACTIVE" && org.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "Cancele a assinatura antes de deletar a organização." },
      { status: 409 }
    );
  }

  await prisma.organization.delete({ where: { id: ctx.orgId } });
  return NextResponse.json({ ok: true });
}
