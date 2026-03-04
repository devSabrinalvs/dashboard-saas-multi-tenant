import type { OrgContext } from "@/server/org/require-org-context";
import { deleteProject as repoDeleteProject, type Project } from "@/server/repo/project-repo";
import { getProject } from "./get-project";

/**
 * Deleta um projeto (hard delete).
 * Tasks filhas com onDelete: Restrict causarão erro DB se existirem.
 *
 * Pré-condição: chamador já verificou permissão "project:delete" via assertPermission.
 *
 * @throws ProjectNotFoundError se o projeto não existir ou for de outra org.
 */
export async function deleteProject(
  ctx: OrgContext,
  projectId: string
): Promise<Project> {
  // Verifica que o projeto pertence à org (cross-tenant guard)
  await getProject(ctx, projectId);

  const deleted = await repoDeleteProject(projectId);

  // TODO(Etapa 8 - Audit): log("project.deleted", { orgId: ctx.orgId, projectId, actorId: ctx.userId })

  return deleted;
}
