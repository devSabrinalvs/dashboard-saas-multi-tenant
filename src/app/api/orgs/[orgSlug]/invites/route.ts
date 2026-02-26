import { NextRequest } from "next/server";
import { resolveOrgContext, assertPermission } from "@/shared/security";
import { memberRepo } from "@/features/members/repo";
import { inviteMemberSchema } from "@/features/members/schemas";
import { handleApiError, apiError } from "@/shared/utils";

// POST /api/orgs/[orgSlug]/invites — create invite (admin/owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "member:invite");

    const body = await request.json();
    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        JSON.stringify(parsed.error.flatten().fieldErrors),
        400
      );
    }

    const invite = await memberRepo.createInvite({
      email: parsed.data.email,
      role: parsed.data.role,
      orgId: context.orgId,
      invitedBy: context.userId,
    });

    return Response.json(invite, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/orgs/[orgSlug]/invites — list pending invites
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "member:invite");

    const invites = await memberRepo.listInvitesByOrg(context.orgId);
    return Response.json(invites);
  } catch (error) {
    return handleApiError(error);
  }
}
