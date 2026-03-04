import type { OrgContext } from "@/server/org/require-org-context";
import { findProjectById, type Project } from "@/server/repo/project-repo";
import { ProjectNotFoundError } from "@/server/errors/project-errors";

/**
 * Retorna um projeto verificando que pertence à organização do contexto.
 * Lança ProjectNotFoundError (404) se não existir ou for de outra org.
 */
export async function getProject(
  ctx: OrgContext,
  projectId: string
): Promise<Project> {
  const project = await findProjectById(projectId, ctx.orgId);
  if (!project) throw new ProjectNotFoundError();
  return project;
}
