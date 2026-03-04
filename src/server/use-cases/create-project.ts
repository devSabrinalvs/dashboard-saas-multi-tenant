import type { OrgContext } from "@/server/org/require-org-context";
import { createProject as repoCreateProject, type Project } from "@/server/repo/project-repo";

export type CreateProjectData = {
  name: string;
  description?: string;
};

/**
 * Cria um projeto para a organização.
 *
 * Pré-condição: chamador já verificou permissão "project:create" via assertPermission.
 */
export async function createProject(
  ctx: OrgContext,
  data: CreateProjectData
): Promise<Project> {
  const project = await repoCreateProject({
    orgId: ctx.orgId,
    name: data.name,
    description: data.description,
  });

  // TODO(Etapa 8 - Audit): log("project.created", { orgId: ctx.orgId, projectId: project.id, actorId: ctx.userId })

  return project;
}
