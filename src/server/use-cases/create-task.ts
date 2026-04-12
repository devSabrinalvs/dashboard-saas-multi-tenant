import type { OrgContext } from "@/server/org/require-org-context";
import { createTask as repoCreateTask, countTasksByProject, type Task } from "@/server/repo/task-repo";
import type { TaskStatus, Priority } from "@/generated/prisma/enums";
import { getProject } from "./get-project";
import { logAudit } from "@/server/audit/log-audit";
import { getPlanLimits, PlanLimitReachedError } from "@/billing/plan-limits";
import { findMembership } from "@/server/repo/membership-repo";
import { AssigneeNotInOrgError } from "@/server/errors/project-errors";
import { createNotification } from "@/server/notifications/create-notification";
import { logTaskActivity } from "@/server/tasks/log-task-activity";

export type CreateTaskData = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
  tags?: string[];
  assigneeUserId?: string | null;
};

/**
 * Cria uma task no projeto.
 * Verifica que o projeto pertence à org antes de criar.
 *
 * Pré-condição: chamador já verificou permissão "task:create" via assertPermission.
 *
 * @throws ProjectNotFoundError se o projeto não existir ou for de outra org.
 */
export async function createTask(
  ctx: OrgContext,
  projectId: string,
  data: CreateTaskData
): Promise<Task> {
  // Verifica cross-tenant: projeto deve pertencer à org
  await getProject(ctx, projectId);

  const taskCount = await countTasksByProject(ctx.orgId, projectId);
  const limits = getPlanLimits(ctx.plan);
  if (taskCount >= limits.maxTasksPerProject) {
    throw new PlanLimitReachedError({
      resource: "tasks_per_project",
      limit: limits.maxTasksPerProject,
      current: taskCount,
      plan: ctx.plan,
    });
  }

  // Valida que o assignee é membro desta org
  if (data.assigneeUserId !== undefined && data.assigneeUserId !== null) {
    const membership = await findMembership(data.assigneeUserId, ctx.orgId);
    if (!membership) throw new AssigneeNotInOrgError();
  }

  const task = await repoCreateTask({
    orgId: ctx.orgId,
    projectId,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    dueDate: data.dueDate,
    tags: data.tags,
    assigneeUserId: data.assigneeUserId,
  });

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "task.created",
    metadata: { taskId: task.id, projectId, title: task.title },
  });

  void logTaskActivity({
    taskId: task.id,
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "task.created",
    metadata: { title: task.title },
  });

  // Notificar o responsável se for diferente do criador
  if (task.assigneeUserId && task.assigneeUserId !== ctx.userId) {
    void createNotification({
      userId: task.assigneeUserId,
      orgId: ctx.orgId,
      type: "task.assigned",
      message: `Você foi atribuído à tarefa "${task.title}".`,
      link: `/org/${ctx.orgSlug}/projects/${projectId}`,
    });
  }

  return task;
}
