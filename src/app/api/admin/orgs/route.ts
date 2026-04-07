import { NextResponse } from "next/server";
import { requireSuperAdminForApi, isAdminContext } from "@/server/auth/require-super-admin";
import { searchAdminOrgs } from "@/server/repo/admin-org-repo";
import { adminOrgSearchSchema } from "@/schemas/admin";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { adminGlobalKey } from "@/security/rate-limit/keys";

export async function GET(req: Request) {
  const ctx = await requireSuperAdminForApi();
  if (!isAdminContext(ctx)) return ctx;

  const rl = await rateLimit(adminGlobalKey(ctx.email), RATE_LIMITS.ADMIN_GLOBAL);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = adminOrgSearchSchema.safeParse({ search: searchParams.get("search") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos", details: parsed.error.flatten() }, { status: 422 });
  }

  const orgs = await searchAdminOrgs(parsed.data.search);
  return NextResponse.json({ orgs });
}
