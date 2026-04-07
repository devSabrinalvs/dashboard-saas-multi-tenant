import { NextResponse } from "next/server";
import { requireSuperAdminForApi, isAdminContext } from "@/server/auth/require-super-admin";
import { findAdminUserById } from "@/server/repo/admin-user-repo";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { adminGlobalKey } from "@/security/rate-limit/keys";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await requireSuperAdminForApi();
  if (!isAdminContext(ctx)) return ctx;

  const rl = await rateLimit(adminGlobalKey(ctx.email), RATE_LIMITS.ADMIN_GLOBAL);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
  }

  const { userId } = await params;
  const user = await findAdminUserById(userId);
  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ user });
}
