/**
 * PATCH  /api/org/.../comments/[commentId] — edita comentário (só o autor)
 * DELETE /api/org/.../comments/[commentId] — deleta comentário (autor ou admin+)
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { can } from "@/security/rbac";

const patchSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string; commentId: string }> }
) {
  const { orgSlug, commentId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const comment = await prisma.taskComment.findFirst({
    where: { id: commentId, orgId: ctx.orgId },
  });
  if (!comment) return NextResponse.json({ error: "Comentário não encontrado." }, { status: 404 });

  // Só o autor pode editar
  if (comment.authorId !== ctx.userId) {
    return NextResponse.json({ error: "Sem permissão para editar este comentário." }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const updated = await prisma.taskComment.update({
    where: { id: commentId },
    data: { content: parsed.data.content },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ comment: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string; commentId: string }> }
) {
  const { orgSlug, commentId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const comment = await prisma.taskComment.findFirst({
    where: { id: commentId, orgId: ctx.orgId },
  });
  if (!comment) return NextResponse.json({ error: "Comentário não encontrado." }, { status: 404 });

  // Autor pode deletar; admins e owners também
  const isAuthor = comment.authorId === ctx.userId;
  const isAdminOrAbove = can(ctx.role, "member:remove"); // ADMIN + OWNER
  if (!isAuthor && !isAdminOrAbove) {
    return NextResponse.json({ error: "Sem permissão para deletar este comentário." }, { status: 403 });
  }

  await prisma.taskComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
