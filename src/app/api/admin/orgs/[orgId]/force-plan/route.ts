import { NextResponse } from "next/server";
import { requireSuperAdminForApi, isAdminContext } from "@/server/auth/require-super-admin";
import { adminForcePlanSchema } from "@/schemas/admin";
import { adminForceOrgPlanUseCase, AdminOrgNotFoundError, AdminOrgConfirmMismatchError } from "@/server/use-cases/admin/force-org-plan";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { adminActionKey } from "@/security/rate-limit/keys";
import type { Plan } from "@/generated/prisma/enums";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const ctx = await requireSuperAdminForApi();
  if (!isAdminContext(ctx)) return ctx;

  const rl = await rateLimit(adminActionKey(ctx.email), RATE_LIMITS.ADMIN_ACTION);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  const parsed = adminForcePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 422 });
  }

  const { orgId } = await params;

  try {
    await adminForceOrgPlanUseCase(
      ctx.email,
      orgId,
      parsed.data.plan as Plan,
      parsed.data.confirm
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminOrgNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AdminOrgConfirmMismatchError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
