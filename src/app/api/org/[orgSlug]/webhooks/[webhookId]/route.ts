import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateWebhookSchema = z.object({
  active: z.boolean().optional(),
  events: z.array(z.string()).min(1).optional(),
});

/**
 * PATCH  /api/org/[orgSlug]/webhooks/[webhookId]  — Atualizar ativo/eventos
 * DELETE /api/org/[orgSlug]/webhooks/[webhookId]  — Remover webhook
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; webhookId: string }> }
) {
  const { orgSlug, webhookId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "member:invite");

  const wh = await prisma.orgWebhook.findFirst({ where: { id: webhookId, orgId: ctx.orgId } });
  if (!wh) return NextResponse.json({ error: "Webhook não encontrado." }, { status: 404 });

  const body = await req.json();
  const parsed = updateWebhookSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });

  const updated = await prisma.orgWebhook.update({
    where: { id: webhookId },
    data: parsed.data,
    select: { id: true, url: true, events: true, active: true },
  });

  return NextResponse.json({ webhook: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; webhookId: string }> }
) {
  const { orgSlug, webhookId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "member:invite");

  const wh = await prisma.orgWebhook.findFirst({ where: { id: webhookId, orgId: ctx.orgId } });
  if (!wh) return NextResponse.json({ error: "Webhook não encontrado." }, { status: 404 });

  await prisma.orgWebhook.delete({ where: { id: webhookId } });
  return NextResponse.json({ ok: true });
}
