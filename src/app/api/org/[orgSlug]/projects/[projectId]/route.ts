import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { projectUpdateSchema } from "@/schemas/project";
import { getProject } from "@/server/use-cases/get-project";
import { updateProject } from "@/server/use-cases/update-project";
import { deleteProject } from "@/server/use-cases/delete-project";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { mutationKey } from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

/**
 * GET /api/org/[orgSlug]/projects/[projectId]
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string }> }
) {
  try {
    const { orgSlug, projectId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    const project = await getProject(ctx, projectId);
    return NextResponse.json({ project });
  } catch (err) {
    if (err instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

/**
 * PATCH /api/org/[orgSlug]/projects/[projectId]
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string }> }
) {
  try {
    const { orgSlug, projectId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "project:update");

    const rl = await rateLimit(mutationKey(ctx.orgId, ctx.userId), RATE_LIMITS.MUTATIONS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde.", resetAt: rl.resetAt },
        { status: 429 }
      );
    }

    const body = (await req.json()) as unknown;
    const parsed = projectUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const project = await updateProject(ctx, projectId, parsed.data);
    return NextResponse.json({ project });
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

/**
 * DELETE /api/org/[orgSlug]/projects/[projectId]
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string }> }
) {
  try {
    const { orgSlug, projectId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "project:delete");

    const rl = await rateLimit(mutationKey(ctx.orgId, ctx.userId), RATE_LIMITS.MUTATIONS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde.", resetAt: rl.resetAt },
        { status: 429 }
      );
    }

    await deleteProject(ctx, projectId);
    return NextResponse.json({ ok: true });
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
