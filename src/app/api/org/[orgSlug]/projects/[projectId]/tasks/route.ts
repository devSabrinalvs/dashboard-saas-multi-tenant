import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { taskCreateSchema, taskQuerySchema } from "@/schemas/task";
import { listTasksByProject } from "@/server/use-cases/list-tasks";
import { createTask } from "@/server/use-cases/create-task";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
import type { TaskStatus } from "@/generated/prisma/enums";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { mutationKey } from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

/**
 * GET /api/org/[orgSlug]/projects/[projectId]/tasks
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string }> }
) {
  try {
    const { orgSlug, projectId } = await params;
    const ctx = await requireOrgContext(orgSlug);

    const { searchParams } = new URL(req.url);
    const parsed = taskQuerySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const result = await listTasksByProject(ctx, projectId, {
      ...parsed.data,
      status: parsed.data.status as TaskStatus | undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

/**
 * POST /api/org/[orgSlug]/projects/[projectId]/tasks
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string }> }
) {
  try {
    const { orgSlug, projectId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "task:create");

    const rl = await rateLimit(mutationKey(ctx.orgId, ctx.userId), RATE_LIMITS.MUTATIONS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde.", resetAt: rl.resetAt },
        { status: 429 }
      );
    }

    const body = (await req.json()) as unknown;
    const parsed = taskCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const task = await createTask(ctx, projectId, {
      ...parsed.data,
      status: parsed.data.status as TaskStatus | undefined,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
