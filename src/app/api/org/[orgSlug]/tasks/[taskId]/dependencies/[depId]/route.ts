/**
 * DELETE /api/org/[orgSlug]/tasks/[taskId]/dependencies/[depId] — remove dependência
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string; depId: string }> }
) {
  const { orgSlug, taskId, depId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "task:update");

  const dep = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "TaskDependency"
    WHERE id = ${depId} AND "orgId" = ${ctx.orgId}
    AND ("blockingTaskId" = ${taskId} OR "blockedTaskId" = ${taskId})
    LIMIT 1
  `;
  if (dep.length === 0) {
    return NextResponse.json({ error: "Dependência não encontrada." }, { status: 404 });
  }

  await prisma.taskDependency.delete({ where: { id: depId } });
  return new NextResponse(null, { status: 204 });
}
