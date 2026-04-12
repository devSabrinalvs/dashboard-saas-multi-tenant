import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/org/[orgSlug]/tasks/[taskId]/time/[entryId]
 * Apenas o próprio usuário pode deletar sua entrada.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string; entryId: string }> }
) {
  const { orgSlug, taskId, entryId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const entry = await prisma.timeEntry.findFirst({
    where: { id: entryId, taskId, orgId: ctx.orgId },
    select: { id: true, userId: true },
  });

  if (!entry) return NextResponse.json({ error: "Entrada não encontrada." }, { status: 404 });
  if (entry.userId !== ctx.userId) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  await prisma.timeEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
