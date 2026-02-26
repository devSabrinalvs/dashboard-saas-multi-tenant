import { NextRequest } from "next/server";
import { resolveOrgContext, assertPermission } from "@/shared/security";
import { taskRepo } from "@/features/tasks/repo";
import { updateTaskSchema } from "@/features/tasks/schemas";
import { handleApiError, apiError } from "@/shared/utils";

type Params = {
  params: Promise<{ orgSlug: string; projectId: string; taskId: string }>;
};

// PATCH /api/orgs/[orgSlug]/projects/[projectId]/tasks/[taskId]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { orgSlug, taskId } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "task:update");

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten().fieldErrors), 400);
    }

    const task = await taskRepo.update(taskId, context.orgId, parsed.data);
    return Response.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/orgs/[orgSlug]/projects/[projectId]/tasks/[taskId]
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { orgSlug, taskId } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "task:delete");

    await taskRepo.remove(taskId, context.orgId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
