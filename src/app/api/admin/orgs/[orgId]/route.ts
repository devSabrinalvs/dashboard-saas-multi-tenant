import { NextResponse } from "next/server";
import { requireSuperAdminForApi, isAdminContext } from "@/server/auth/require-super-admin";
import { findAdminOrgById } from "@/server/repo/admin-org-repo";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { adminGlobalKey } from "@/security/rate-limit/keys";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const ctx = await requireSuperAdminForApi();
  if (!isAdminContext(ctx)) return ctx;

  const rl = await rateLimit(adminGlobalKey(ctx.email), RATE_LIMITS.ADMIN_GLOBAL);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
  }

  const { orgId } = await params;
  const org = await findAdminOrgById(orgId);
  if (!org) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ org });
}
