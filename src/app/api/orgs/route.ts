import { NextRequest } from "next/server";
import { requireUserId } from "@/shared/security";
import { orgRepo } from "@/features/orgs/repo";
import { createOrgSchema } from "@/features/orgs/schemas";
import { handleApiError, apiError } from "@/shared/utils";

// GET /api/orgs — list orgs for authenticated user
export async function GET() {
  try {
    const userId = await requireUserId();
    const memberships = await orgRepo.findByUserId(userId);
    return Response.json(memberships);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/orgs — create org + OWNER membership + audit log
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();

    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        JSON.stringify(parsed.error.flatten().fieldErrors),
        400
      );
    }

    const slugTaken = await orgRepo.slugExists(parsed.data.slug);
    if (slugTaken) {
      return apiError("Slug already taken", 409);
    }

    const org = await orgRepo.create({ ...parsed.data, userId });
    return Response.json(org, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
