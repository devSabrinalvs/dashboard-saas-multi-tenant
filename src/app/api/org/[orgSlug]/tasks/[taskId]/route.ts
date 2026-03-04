import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { taskUpdateSchema } from "@/schemas/task";
import { updateTask } from "@/server/use-cases/update-task";
import { deleteTask } from "@/server/use-cases/delete-task";
import { TaskNotFoundError } from "@/server/errors/project-errors";
import type { TaskStatus } from "@/generated/prisma/enums";

/**
 * PATCH /api/org/[orgSlug]/tasks/[taskId]
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  try {
    const { orgSlug, taskId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "task:update");

    const body = (await req.json()) as unknown;
    const parsed = taskUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const task = await updateTask(ctx, taskId, {
      ...parsed.data,
      status: parsed.data.status as TaskStatus | undefined,
    });
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof TaskNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

/**
 * DELETE /api/org/[orgSlug]/tasks/[taskId]
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  try {
    const { orgSlug, taskId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "task:delete");

    await deleteTask(ctx, taskId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof TaskNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
