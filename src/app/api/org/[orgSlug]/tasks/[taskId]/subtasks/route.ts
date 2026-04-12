/**
 * GET  /api/org/[orgSlug]/tasks/[taskId]/subtasks — lista sub-tarefas
 * POST /api/org/[orgSlug]/tasks/[taskId]/subtasks — cria sub-tarefa
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission, PermissionDeniedError } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSubTaskSchema = z.object({
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres").max(200),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  // Verifica que a task pai pertence à org
  const parent = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId } });
  if (!parent) {
    return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  }

  const subTasks = await prisma.task.findMany({
    where: { parentTaskId: taskId, orgId: ctx.orgId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ subTasks });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  try {
    const { orgSlug, taskId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "task:create");

    const parent = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId } });
    if (!parent) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }

    const body = (await req.json()) as unknown;
    const parsed = createSubTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 422 }
      );
    }

    const subTask = await prisma.task.create({
      data: {
        title: parsed.data.title,
        orgId: ctx.orgId,
        projectId: parent.projectId,
        parentTaskId: taskId,
        status: "TODO",
        priority: "MEDIUM",
        tags: [],
      },
    });

    return NextResponse.json({ subTask }, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
