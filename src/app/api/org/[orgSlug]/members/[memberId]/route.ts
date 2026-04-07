import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { removeMember } from "@/server/use-cases/remove-member";
import {
  MemberNotFoundError,
  LastOwnerError,
} from "@/server/errors/team-errors";
import { validateCsrfRequest } from "@/lib/csrf";

/**
 * DELETE /api/org/[orgSlug]/members/[memberId]
 * Success: 200 { ok: true }
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; memberId: string }> }
) {
  if (!validateCsrfRequest(req)) {
    return NextResponse.json({ error: "Token CSRF inválido." }, { status: 403 });
  }

  try {
    const { orgSlug, memberId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "member:remove");

    await removeMember({
      orgId: ctx.orgId,
      actorCtx: ctx,
      targetMemberId: memberId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof MemberNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof LastOwnerError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
