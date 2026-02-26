import { NextRequest } from "next/server";
import { resolveOrgContext } from "@/shared/security";
import { memberRepo } from "@/features/members/repo";
import { handleApiError } from "@/shared/utils";

// GET /api/orgs/[orgSlug]/members — list members (any member can view)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const context = await resolveOrgContext(orgSlug);
    const members = await memberRepo.listByOrg(context.orgId);
    return Response.json(members);
  } catch (error) {
    return handleApiError(error);
  }
}
