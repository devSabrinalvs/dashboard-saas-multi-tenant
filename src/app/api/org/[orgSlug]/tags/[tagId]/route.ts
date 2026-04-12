import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTagSchema = z.object({
  name: z.string().min(1).max(32).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

/**
 * PATCH  /api/org/[orgSlug]/tags/[tagId]  — Atualiza nome/cor
 * DELETE /api/org/[orgSlug]/tags/[tagId]  — Remove tag (OWNER/ADMIN)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; tagId: string }> }
) {
  const { orgSlug, tagId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "task:update");

  const body = await req.json();
  const parsed = updateTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
  }

  const tag = await prisma.orgTag.findFirst({ where: { id: tagId, orgId: ctx.orgId } });
  if (!tag) return NextResponse.json({ error: "Tag não encontrada." }, { status: 404 });

  const updated = await prisma.orgTag.update({
    where: { id: tagId },
    data: parsed.data,
    select: { id: true, name: true, color: true },
  });

  return NextResponse.json({ tag: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; tagId: string }> }
) {
  const { orgSlug, tagId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "project:delete"); // OWNER/ADMIN

  const tag = await prisma.orgTag.findFirst({ where: { id: tagId, orgId: ctx.orgId } });
  if (!tag) return NextResponse.json({ error: "Tag não encontrada." }, { status: 404 });

  await prisma.orgTag.delete({ where: { id: tagId } });
  return NextResponse.json({ ok: true });
}
