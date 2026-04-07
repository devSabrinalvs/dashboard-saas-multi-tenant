import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { dataImportKey } from "@/security/rate-limit/keys";
import { exportPayloadSchema, importQuerySchema, EXPORT_LIMITS } from "@/schemas/data-export";
import { importOrgData } from "@/server/use-cases/import-org-data";
import { logAudit } from "@/server/audit/log-audit";

/**
 * POST /api/org/[orgSlug]/import
 *
 * Importa dados de um payload JSON v1.
 * Suporta ?dryRun=true para validar sem persistir.
 *
 * Body: ExportPayload (application/json)
 * Limite: 5 MB
 *
 * Permissão: data:import (OWNER + ADMIN)
 * Rate limit: 3 req/h por orgId+userId
 */
export async function POST(
  req: Request,
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
    assertPermission(ctx, "data:import");
  } catch {
    return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
  }

  const rl = await rateLimit(
    dataImportKey(ctx.orgId, ctx.userId),
    RATE_LIMITS.DATA_IMPORT
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit excedido. Tente novamente em 1 hora." },
      { status: 429 }
    );
  }

  // Verificar tamanho do payload
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > EXPORT_LIMITS.MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: `Payload excede o limite de ${EXPORT_LIMITS.MAX_PAYLOAD_BYTES / (1024 * 1024)} MB` },
      { status: 400 }
    );
  }

  // Parse do dryRun query param
  const { searchParams } = new URL(req.url);
  const queryParsed = importQuerySchema.safeParse({
    dryRun: searchParams.get("dryRun") ?? undefined,
  });
  const dryRun = queryParsed.success ? queryParsed.data.dryRun : false;

  // Ler e verificar tamanho do body
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Erro ao ler body" }, { status: 400 });
  }

  if (rawBody.length > EXPORT_LIMITS.MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: `Payload excede o limite de ${EXPORT_LIMITS.MAX_PAYLOAD_BYTES / (1024 * 1024)} MB` },
      { status: 400 }
    );
  }

  // Parse JSON
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Validar schema v1
  const parsed = exportPayloadSchema.safeParse(rawJson);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Formato de export inválido",
        details: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  const result = await importOrgData(ctx.orgId, parsed.data, dryRun);

  if (!dryRun) {
    void logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "data.imported",
      metadata: {
        createdProjects: result.createdProjects,
        createdTasks: result.createdTasks,
        skippedTasks: result.skippedTasks,
        sourceOrgSlug: parsed.data.org.slug,
      },
    });
  }

  return NextResponse.json(result);
}
