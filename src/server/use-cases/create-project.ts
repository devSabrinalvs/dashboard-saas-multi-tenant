import type { OrgContext } from "@/server/org/require-org-context";
import { createProject as repoCreateProject, countProjects, type Project } from "@/server/repo/project-repo";
import { logAudit } from "@/server/audit/log-audit";
import { getPlanLimits, PlanLimitReachedError } from "@/billing/plan-limits";

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
  const projectCount = await countProjects(ctx.orgId);
  const limits = getPlanLimits(ctx.plan);
  if (projectCount >= limits.maxProjects) {
    throw new PlanLimitReachedError({
      resource: "projects",
      limit: limits.maxProjects,
      current: projectCount,
      plan: ctx.plan,
    });
  }

  const project = await repoCreateProject({
    orgId: ctx.orgId,
    name: data.name,
    description: data.description,
  });

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "project.created",
    metadata: { projectId: project.id, name: project.name },
  });

  return project;
}
