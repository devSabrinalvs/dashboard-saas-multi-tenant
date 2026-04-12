import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/org/[orgSlug]/tasks/[taskId]/activity
 *
 * Retorna o histórico de atividade de uma tarefa (últimas 50 entradas).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  // Verifica que a task pertence à org
  const task = await prisma.task.findFirst({
    where: { id: taskId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  const activities = await prisma.$queryRaw<
    {
      id: string;
      action: string;
      metadata: unknown;
      createdAt: Date;
      userId: string | null;
      userName: string | null;
      userEmail: string | null;
    }[]
  >`
    SELECT
      a.id,
      a.action,
      a.metadata,
      a."createdAt",
      a."userId",
      u.name AS "userName",
      u.email AS "userEmail"
    FROM "TaskActivity" a
    LEFT JOIN "User" u ON u.id = a."userId"
    WHERE a."taskId" = ${taskId}
      AND a."orgId" = ${ctx.orgId}
    ORDER BY a."createdAt" DESC
    LIMIT 50
  `;

  return NextResponse.json({ activities });
}
