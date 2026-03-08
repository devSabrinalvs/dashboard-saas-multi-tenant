import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { listAuditLogs } from "@/server/use-cases/list-audit-logs";
import { auditQuerySchema } from "@/schemas/audit";

/**
 * GET /api/org/[orgSlug]/audit
 * Query params: action, search, actorId, from, to, page, pageSize
 * Success: 200 PaginatedResult<AuditLogItem>
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "audit:read");

    const { searchParams } = new URL(req.url);
    const raw = {
      action: searchParams.get("action") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      actorId: searchParams.get("actorId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    };

    const parsed = auditQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const result = await listAuditLogs(ctx, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
