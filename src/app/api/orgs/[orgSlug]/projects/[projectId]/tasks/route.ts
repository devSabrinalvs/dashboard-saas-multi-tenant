import { NextRequest } from "next/server";
import { resolveOrgContext, assertPermission } from "@/shared/security";
import { taskRepo } from "@/features/tasks/repo";
import { createTaskSchema } from "@/features/tasks/schemas";
import { handleApiError, apiError } from "@/shared/utils";

type Params = { params: Promise<{ orgSlug: string; projectId: string }> };

// GET /api/orgs/[orgSlug]/projects/[projectId]/tasks
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { orgSlug, projectId } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "task:read");

    const tasks = await taskRepo.listByProject(projectId, context.orgId);
    return Response.json(tasks);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/orgs/[orgSlug]/projects/[projectId]/tasks
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { orgSlug, projectId } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "task:create");

    const body = await request.json();
    const parsed = createTaskSchema.safeParse({ ...body, projectId });
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten().fieldErrors), 400);
    }

    const task = await taskRepo.create({
      ...parsed.data,
      orgId: context.orgId,
    });
    return Response.json(task, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
