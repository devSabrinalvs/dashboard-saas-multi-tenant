import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { taskBulkActionSchema } from "@/schemas/task";
import { prisma } from "@/lib/prisma";
import type { TaskStatus } from "@/generated/prisma/enums";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { mutationKey } from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

/**
 * PATCH /api/org/[orgSlug]/tasks/bulk
 *
 * Aplica uma ação em lote sobre múltiplas tasks.
 * Requer que TODAS as tasks pertençam à org (WHERE inclui orgId).
 *
 * Body (discriminated union):
 *   { action: "setStatus", taskIds: string[], status: TaskStatus }
 *   { action: "delete",    taskIds: string[] }
 *
 * Resposta: { count: number }
 *
 * Permissões:
 *   setStatus → task:update
 *   delete    → task:delete
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);

    const rl = await rateLimit(
      mutationKey(ctx.orgId, ctx.userId),
      RATE_LIMITS.MUTATIONS
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde.", resetAt: rl.resetAt },
        { status: 429 }
      );
    }

    const body = (await req.json()) as unknown;
    const parsed = taskBulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { action, taskIds } = parsed.data;

    if (action === "setStatus") {
      assertPermission(ctx, "task:update");
      const { count } = await prisma.task.updateMany({
        where: { id: { in: taskIds }, orgId: ctx.orgId },
        data: { status: parsed.data.status as TaskStatus },
      });
      return NextResponse.json({ count });
    }

    // action === "delete"
    assertPermission(ctx, "task:delete");
    const { count } = await prisma.task.deleteMany({
      where: { id: { in: taskIds }, orgId: ctx.orgId },
    });
    return NextResponse.json({ count });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
