/**
 * PATCH  /api/org/[orgSlug]/tasks/[taskId]/subtasks/[subTaskId] — atualiza sub-tarefa
 * DELETE /api/org/[orgSlug]/tasks/[taskId]/subtasks/[subTaskId] — deleta sub-tarefa
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission, PermissionDeniedError } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["TODO", "DONE"]).optional(),
  title: z.string().min(2).max(200).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string; subTaskId: string }> }
) {
  try {
    const { orgSlug, taskId, subTaskId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "task:update");

    const body = (await req.json()) as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
    }

    const { count } = await prisma.task.updateMany({
      where: { id: subTaskId, parentTaskId: taskId, orgId: ctx.orgId },
      data: parsed.data,
    });
    if (count === 0) {
      return NextResponse.json({ error: "Sub-tarefa não encontrada." }, { status: 404 });
    }

    const updated = await prisma.task.findFirst({ where: { id: subTaskId } });
    return NextResponse.json({ subTask: updated });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string; subTaskId: string }> }
) {
  try {
    const { orgSlug, taskId, subTaskId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "task:delete");

    const sub = await prisma.task.findFirst({
      where: { id: subTaskId, parentTaskId: taskId, orgId: ctx.orgId },
    });
    if (!sub) {
      return NextResponse.json({ error: "Sub-tarefa não encontrada." }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: subTaskId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
