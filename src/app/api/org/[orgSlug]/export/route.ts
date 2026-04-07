import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { dataExportKey } from "@/security/rate-limit/keys";
import { exportOrgData } from "@/server/use-cases/export-org-data";
import { logAudit } from "@/server/audit/log-audit";

/**
 * GET /api/org/[orgSlug]/export
 *
 * Exporta todos os projects e tasks da organização em formato JSON v1.
 * Força download via Content-Disposition.
 *
 * Permissão: data:export (OWNER + ADMIN)
 * Rate limit: 5 req/h por orgId+userId
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;

  let ctx;
  try {
    ctx = await requireOrgContext(orgSlug);
  } catch {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    assertPermission(ctx, "data:export");
  } catch {
    return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
  }

  const rl = await rateLimit(
    dataExportKey(ctx.orgId, ctx.userId),
    RATE_LIMITS.DATA_EXPORT
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit excedido. Tente novamente em 1 hora." },
      { status: 429 }
    );
  }

  const result = await exportOrgData(ctx.orgId, ctx.orgSlug, ctx.orgName);

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "data.exported",
    metadata: {
      projectCount: result.projectCount,
      taskCount: result.taskCount,
    },
  });

  const filename = `export-${ctx.orgSlug}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(result.payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
