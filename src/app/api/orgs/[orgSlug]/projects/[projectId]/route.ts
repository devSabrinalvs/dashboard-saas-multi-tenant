import { NextRequest } from "next/server";
import { resolveOrgContext, assertPermission } from "@/shared/security";
import { projectRepo } from "@/features/projects/repo";
import { updateProjectSchema } from "@/features/projects/schemas";
import { handleApiError, apiError } from "@/shared/utils";

type Params = { params: Promise<{ orgSlug: string; projectId: string }> };

// GET /api/orgs/[orgSlug]/projects/[projectId]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { orgSlug, projectId } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "project:read");

    const project = await projectRepo.findById(projectId, context.orgId);
    if (!project) return apiError("Project not found", 404);
    return Response.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/orgs/[orgSlug]/projects/[projectId]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { orgSlug, projectId } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "project:update");

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(JSON.stringify(parsed.error.flatten().fieldErrors), 400);
    }

    const project = await projectRepo.update(
      projectId,
      context.orgId,
      parsed.data
    );
    return Response.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/orgs/[orgSlug]/projects/[projectId]
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { orgSlug, projectId } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "project:delete");

    await projectRepo.remove(projectId, context.orgId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
