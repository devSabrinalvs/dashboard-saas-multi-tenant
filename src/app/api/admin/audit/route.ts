import { NextResponse } from "next/server";
import { requireSuperAdminForApi, isAdminContext } from "@/server/auth/require-super-admin";
import { listAdminAuditLogs } from "@/server/repo/admin-audit-repo";
import { adminAuditQuerySchema } from "@/schemas/admin";
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
  const parsed = adminAuditQuerySchema.safeParse({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
    search: searchParams.get("search") ?? "",
    action: searchParams.get("action") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos", details: parsed.error.flatten() }, { status: 422 });
  }

  const result = await listAdminAuditLogs(parsed.data);
  return NextResponse.json(result);
}
