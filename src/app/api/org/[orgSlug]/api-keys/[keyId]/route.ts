/**
 * DELETE /api/org/[orgSlug]/api-keys/[keyId] — revoga (desativa) uma API key
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; keyId: string }> }
) {
  const { orgSlug, keyId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "billing:manage"); // OWNER only

  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, orgId: ctx.orgId },
  });
  if (!key) return NextResponse.json({ error: "API key não encontrada." }, { status: 404 });

  // Soft-delete: desativa a key (mantém histórico)
  await prisma.apiKey.updateMany({
    where: { id: keyId, orgId: ctx.orgId },
    data: { active: false },
  });

  return new NextResponse(null, { status: 204 });
}
