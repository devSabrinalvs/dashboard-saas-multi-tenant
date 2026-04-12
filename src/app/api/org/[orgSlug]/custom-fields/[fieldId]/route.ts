/**
 * DELETE /api/org/[orgSlug]/custom-fields/[fieldId] — remove definição e todos os valores
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; fieldId: string }> }
) {
  const { orgSlug, fieldId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "member:invite"); // ADMIN+

  const field = await prisma.customFieldDef.findFirst({
    where: { id: fieldId, orgId: ctx.orgId },
  });
  if (!field) return NextResponse.json({ error: "Campo não encontrado." }, { status: 404 });

  await prisma.customFieldDef.delete({ where: { id: fieldId } });
  return new NextResponse(null, { status: 204 });
}
