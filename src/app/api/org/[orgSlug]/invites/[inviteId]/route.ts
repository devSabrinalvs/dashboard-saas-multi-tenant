import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { revokeInvite } from "@/server/use-cases/revoke-invite";
import { InviteNotFoundError } from "@/server/errors/team-errors";

/**
 * DELETE /api/org/[orgSlug]/invites/[inviteId]
 * Success: 200 { ok: true }
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; inviteId: string }> }
) {
  try {
    const { orgSlug, inviteId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "member:invite");

    await revokeInvite({ orgId: ctx.orgId, inviteId, actorUserId: ctx.userId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof InviteNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
