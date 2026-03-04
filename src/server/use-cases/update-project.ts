import type { OrgContext } from "@/server/org/require-org-context";
import { updateProject as repoUpdateProject, type Project } from "@/server/repo/project-repo";
import { getProject } from "./get-project";

export type UpdateProjectData = {
  name?: string;
  description?: string | null;
};

/**
 * Atualiza um projeto verificando pertencimento à org.
 *
 * Pré-condição: chamador já verificou permissão "project:update" via assertPermission.
 *
 * @throws ProjectNotFoundError se o projeto não existir ou for de outra org.
 */
export async function updateProject(
  ctx: OrgContext,
  projectId: string,
  data: UpdateProjectData
): Promise<Project> {
  // Verifica que o projeto pertence à org (cross-tenant guard)
  await getProject(ctx, projectId);

  const project = await repoUpdateProject(projectId, data);

  // TODO(Etapa 8 - Audit): log("project.updated", { orgId: ctx.orgId, projectId, actorId: ctx.userId })

  return project;
}
