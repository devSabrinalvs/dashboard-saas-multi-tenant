/**
 * GET  /api/org/[orgSlug]/tasks/[taskId]/dependencies — lista dependências
 * POST /api/org/[orgSlug]/tasks/[taskId]/dependencies — adiciona dependência (esta task é bloqueada por outra)
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addSchema = z.object({
  blockingTaskId: z.string().min(1),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId } });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  const [blocking, blockedBy] = await Promise.all([
    // tasks que esta task bloqueia (this task is blocking X)
    prisma.$queryRaw<{ id: string; blockedTaskId: string; title: string }[]>`
      SELECT d.id, d."blockedTaskId", t.title
      FROM "TaskDependency" d
      JOIN "Task" t ON t.id = d."blockedTaskId"
      WHERE d."blockingTaskId" = ${taskId} AND d."orgId" = ${ctx.orgId}
    `,
    // tasks que bloqueiam esta task (X is blocking this task)
    prisma.$queryRaw<{ id: string; blockingTaskId: string; title: string }[]>`
      SELECT d.id, d."blockingTaskId", t.title
      FROM "TaskDependency" d
      JOIN "Task" t ON t.id = d."blockingTaskId"
      WHERE d."blockedTaskId" = ${taskId} AND d."orgId" = ${ctx.orgId}
    `,
  ]);

  return NextResponse.json({ blocking, blockedBy });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "task:update");

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId } });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  }

  const { blockingTaskId } = parsed.data;

  if (blockingTaskId === taskId) {
    return NextResponse.json({ error: "Uma tarefa não pode depender de si mesma." }, { status: 400 });
  }

  const blockingTask = await prisma.task.findFirst({ where: { id: blockingTaskId, orgId: ctx.orgId } });
  if (!blockingTask) return NextResponse.json({ error: "Tarefa bloqueante não encontrada." }, { status: 404 });

  // Verifica se já existe
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "TaskDependency"
    WHERE "blockingTaskId" = ${blockingTaskId} AND "blockedTaskId" = ${taskId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    return NextResponse.json({ error: "Dependência já existe." }, { status: 409 });
  }

  const dep = await prisma.taskDependency.create({
    data: {
      orgId: ctx.orgId,
      blockingTaskId,
      blockedTaskId: taskId,
    },
  });

  return NextResponse.json({ dependency: dep }, { status: 201 });
}
