import { NextResponse } from "next/server";
import { requireSuperAdminForApi, isAdminContext } from "@/server/auth/require-super-admin";
import { adminConfirmEmailSchema } from "@/schemas/admin";
import { adminVerifyUserEmailUseCase } from "@/server/use-cases/admin/verify-user-email";
import { AdminUserNotFoundError, AdminConfirmMismatchError } from "@/server/use-cases/admin/unlock-user";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { adminActionKey } from "@/security/rate-limit/keys";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await requireSuperAdminForApi();
  if (!isAdminContext(ctx)) return ctx;

  const rl = await rateLimit(adminActionKey(ctx.email), RATE_LIMITS.ADMIN_ACTION);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  const parsed = adminConfirmEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmação inválida", details: parsed.error.flatten() }, { status: 422 });
  }

  const { userId } = await params;

  try {
    await adminVerifyUserEmailUseCase(ctx.email, userId, parsed.data.confirm);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminUserNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof AdminConfirmMismatchError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
