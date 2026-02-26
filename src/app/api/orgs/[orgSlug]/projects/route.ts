import { NextRequest } from "next/server";
import { resolveOrgContext, assertPermission } from "@/shared/security";
import { projectRepo } from "@/features/projects/repo";
import { createProjectSchema } from "@/features/projects/schemas";
import { handleApiError, apiError } from "@/shared/utils";

// GET /api/orgs/[orgSlug]/projects
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "project:read");

    const projects = await projectRepo.listByOrg(context.orgId);
    return Response.json(projects);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/orgs/[orgSlug]/projects
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const context = await resolveOrgContext(orgSlug);
    assertPermission(context, "project:create");

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        JSON.stringify(parsed.error.flatten().fieldErrors),
        400
      );
    }

    const project = await projectRepo.create({
      ...parsed.data,
      orgId: context.orgId,
    });

    return Response.json(project, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
