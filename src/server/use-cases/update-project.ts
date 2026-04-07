import type { OrgContext } from "@/server/org/require-org-context";
import { updateProject as repoUpdateProject, type Project } from "@/server/repo/project-repo";
import { getProject } from "./get-project";
import { logAudit } from "@/server/audit/log-audit";
import { ProjectNotFoundError } from "@/server/errors/project-errors";

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
  // O repo também filtra por orgId (defense-in-depth duplo)
  await getProject(ctx, projectId);

  // Repo retorna null apenas se o projeto não existir/pertencer à org —
  // o getProject() acima já teria lançado ProjectNotFoundError.
  const project = await repoUpdateProject(projectId, ctx.orgId, data);
  if (!project) throw new ProjectNotFoundError();

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "project.updated",
    metadata: { projectId, changes: data },
  });

  return project;
}
