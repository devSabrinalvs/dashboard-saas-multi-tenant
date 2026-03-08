import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { projectCreateSchema, projectQuerySchema } from "@/schemas/project";
import { listProjects } from "@/server/use-cases/list-projects";
import { createProject } from "@/server/use-cases/create-project";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { mutationKey } from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

/**
 * GET /api/org/[orgSlug]/projects?search=&page=&pageSize=
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);

    const { searchParams } = new URL(req.url);
    const parsed = projectQuerySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const result = await listProjects(ctx, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    throw err;
  }
}

/**
 * POST /api/org/[orgSlug]/projects
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "project:create");

    const rl = await rateLimit(mutationKey(ctx.orgId, ctx.userId), RATE_LIMITS.MUTATIONS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde.", resetAt: rl.resetAt },
        { status: 429 }
      );
    }

    const body = (await req.json()) as unknown;
    const parsed = projectCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const project = await createProject(ctx, parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
