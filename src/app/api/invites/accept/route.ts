import { NextRequest } from "next/server";
import { requireUserId } from "@/shared/security";
import { memberRepo } from "@/features/members/repo";
import { handleApiError, apiError } from "@/shared/utils";

// POST /api/invites/accept — accept invite by token
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const token = body.token as string;

    if (!token) {
      return apiError("Token is required", 400);
    }

    const invite = await memberRepo.findInviteByToken(token);
    if (!invite) {
      return apiError("Invalid invite token", 404);
    }

    const membership = await memberRepo.acceptInvite(token, userId);
    return Response.json(membership, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
