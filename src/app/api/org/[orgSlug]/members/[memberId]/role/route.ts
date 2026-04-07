import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import {
  assertPermission,
  PermissionDeniedError,
} from "@/security/assert-permission";
import { updateMemberRoleSchema } from "@/schemas/invite";
import { updateMemberRole } from "@/server/use-cases/update-member-role";
import {
  MemberNotFoundError,
  LastOwnerError,
  AdminCannotPromoteError,
} from "@/server/errors/team-errors";
import { validateCsrfRequest } from "@/lib/csrf";

/**
 * PATCH /api/org/[orgSlug]/members/[memberId]/role
 * Body: { role: Role }
 * Success: 200 { ok: true }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; memberId: string }> }
) {
  if (!validateCsrfRequest(req)) {
    return NextResponse.json({ error: "Token CSRF inválido." }, { status: 403 });
  }

  try {
    const { orgSlug, memberId } = await params;
    const ctx = await requireOrgContext(orgSlug);
    assertPermission(ctx, "member:role:update");

    const body = (await req.json()) as unknown;
    const parsed = updateMemberRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    await updateMemberRole({
      orgId: ctx.orgId,
      actorCtx: ctx,
      targetMemberId: memberId,
      newRole: parsed.data.role,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof PermissionDeniedError ||
      err instanceof AdminCannotPromoteError
    ) {
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
