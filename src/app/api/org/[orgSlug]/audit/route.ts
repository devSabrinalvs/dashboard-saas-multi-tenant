import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";

/**
 * GET /api/org/[orgSlug]/audit
 *
 * Stub de leitura de audit log — valida RBAC (audit:read).
 * Sem dados reais; implementação completa na Etapa 8.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "audit:read");

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: "Forbidden", message: err.message },
        { status: 403 }
      );
    }
    throw err;
  }
}
