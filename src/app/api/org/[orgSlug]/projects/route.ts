import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";

/**
 * POST /api/org/[orgSlug]/projects
 *
 * Stub de criação de projeto — valida RBAC (project:create).
 * Sem persistência real; implementação completa na Etapa 7.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "project:create");

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
