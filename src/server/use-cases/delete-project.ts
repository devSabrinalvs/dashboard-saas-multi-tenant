import type { OrgContext } from "@/server/org/require-org-context";
import { deleteProject as repoDeleteProject, type Project } from "@/server/repo/project-repo";
import { getProject } from "./get-project";
import { logAudit } from "@/server/audit/log-audit";
import { ProjectNotFoundError } from "@/server/errors/project-errors";

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
  // O repo também filtra por orgId (defense-in-depth duplo)
  await getProject(ctx, projectId);

  const deleted = await repoDeleteProject(projectId, ctx.orgId);
  if (!deleted) throw new ProjectNotFoundError();

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "project.deleted",
    metadata: { projectId, name: deleted.name },
  });

  return deleted;
}
