import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { taskCreateSchema, taskQuerySchema } from "@/schemas/task";
import { listTasksByProject } from "@/server/use-cases/list-tasks";
import { createTask } from "@/server/use-cases/create-task";
import { ProjectNotFoundError, AssigneeNotInOrgError } from "@/server/errors/project-errors";
import { PlanLimitReachedError } from "@/billing/plan-limits";
import type { TaskStatus, Priority } from "@/generated/prisma/enums";
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
      priority: searchParams.get("priority") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
      assignedTo: searchParams.get("assignedTo") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    // Resolve "me" → userId do contexto autenticado
    const assigneeUserId =
      parsed.data.assignedTo === "me" ? ctx.userId : undefined;

    const result = await listTasksByProject(ctx, projectId, {
      search: parsed.data.search,
      status: parsed.data.status as TaskStatus | undefined,
      priority: parsed.data.priority as Priority | undefined,
      tag: parsed.data.tag,
      assigneeUserId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
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
      priority: parsed.data.priority as Priority | undefined,
      dueDate: parsed.data.dueDate != null ? new Date(parsed.data.dueDate) : (parsed.data.dueDate as null | undefined),
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AssigneeNotInOrgError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PlanLimitReachedError) {
      return NextResponse.json(
        { error: err.message, code: err.code, details: err.details },
        { status: err.status }
      );
    }
    throw err;
  }
}
