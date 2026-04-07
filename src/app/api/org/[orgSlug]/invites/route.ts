import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { createInviteSchema } from "@/schemas/invite";
import { createInvite } from "@/server/use-cases/create-invite";
import { InviteDuplicateError } from "@/server/errors/team-errors";
import { PlanLimitReachedError } from "@/billing/plan-limits";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { inviteKey } from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

/**
 * POST /api/org/[orgSlug]/invites
 * Body: { email: string }
 * Success: 201 { inviteId, inviteLink, expiresAt }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "member:invite");

    const rl = await rateLimit(inviteKey(ctx.orgId, ctx.userId), RATE_LIMITS.INVITE);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde.", resetAt: rl.resetAt },
        { status: 429 }
      );
    }

    const body = (await req.json()) as unknown;
    const parsed = createInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const result = await createInvite(ctx, parsed.data.email);

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof InviteDuplicateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof PlanLimitReachedError) {
      return NextResponse.json(
        { error: err.message, code: err.code, details: err.details },
        { status: err.status }
      );
    }
    throw err;
  }
}
