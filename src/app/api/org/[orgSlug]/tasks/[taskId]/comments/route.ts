/**
 * GET  /api/org/[orgSlug]/tasks/[taskId]/comments — lista comentários
 * POST /api/org/[orgSlug]/tasks/[taskId]/comments — cria comentário
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/server/notifications/create-notification";
import { parseMentions } from "@/server/comments/parse-mentions";

const createSchema = z.object({
  content: z.string().min(1, "Comentário não pode ser vazio").max(2000),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId } });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId, orgId: ctx.orgId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ comments });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId } });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 422 }
    );
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      orgId: ctx.orgId,
      authorId: ctx.userId,
      content: parsed.data.content,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  // Notificar o responsável da task (se existir e for diferente do autor)
  if (task.assigneeUserId && task.assigneeUserId !== ctx.userId) {
    void createNotification({
      userId: task.assigneeUserId,
      orgId: ctx.orgId,
      type: "task.commented",
      message: `Novo comentário na tarefa "${task.title}".`,
      link: `/org/${orgSlug}/projects/${task.projectId}`,
    });
  }

  // Notificar membros @mencionados no comentário
  void (async () => {
    try {
      const mentionedIds = await parseMentions(parsed.data.content, ctx.orgId, ctx.userId);
      for (const userId of mentionedIds) {
        if (userId === task.assigneeUserId) continue; // já notificado acima
        void createNotification({
          userId,
          orgId: ctx.orgId,
          type: "task.mentioned",
          message: `Você foi mencionado em um comentário na tarefa "${task.title}".`,
          link: `/org/${orgSlug}/projects/${task.projectId}`,
        });
      }
    } catch {
      // best-effort
    }
  })();

  return NextResponse.json({ comment }, { status: 201 });
}
