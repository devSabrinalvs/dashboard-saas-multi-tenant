import type { OrgContext } from "@/server/org/require-org-context";
import { findTaskById, updateTask as repoUpdateTask, type Task } from "@/server/repo/task-repo";
import type { TaskStatus, Priority } from "@/generated/prisma/enums";
import { TaskNotFoundError, AssigneeNotInOrgError } from "@/server/errors/project-errors";
import { logAudit } from "@/server/audit/log-audit";
import { findMembership } from "@/server/repo/membership-repo";
import { createNotification } from "@/server/notifications/create-notification";
import { logTaskActivity, diffTaskChanges } from "@/server/tasks/log-task-activity";

export type UpdateTaskData = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
  tags?: string[];
  assigneeUserId?: string | null;
};

/**
 * Atualiza uma task verificando pertencimento à org.
 *
 * Pré-condição: chamador já verificou permissão "task:update" via assertPermission.
 *
 * @throws TaskNotFoundError se a task não existir ou for de outra org.
 * @throws AssigneeNotInOrgError se assigneeUserId for fornecido mas não for membro da org.
 */
export async function updateTask(
  ctx: OrgContext,
  taskId: string,
  data: UpdateTaskData
): Promise<Task> {
  const existing = await findTaskById(taskId, ctx.orgId);
  if (!existing) throw new TaskNotFoundError();

  // Valida que o assignee é membro desta org
  if (data.assigneeUserId !== undefined && data.assigneeUserId !== null) {
    const membership = await findMembership(data.assigneeUserId, ctx.orgId);
    if (!membership) throw new AssigneeNotInOrgError();
  }

  // Repo também filtra por orgId (defense-in-depth duplo)
  const task = await repoUpdateTask(taskId, ctx.orgId, data);
  if (!task) throw new TaskNotFoundError();

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "task.updated",
    metadata: { taskId, changes: data },
  });

  const changes = diffTaskChanges(existing, data);
  for (const change of changes) {
    void logTaskActivity({
      taskId,
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: change.action,
      metadata: change.metadata,
    });
  }

  // Notificar novo responsável se mudou e é diferente do editor
  if (
    data.assigneeUserId &&
    data.assigneeUserId !== existing.assigneeUserId &&
    data.assigneeUserId !== ctx.userId
  ) {
    void createNotification({
      userId: data.assigneeUserId,
      orgId: ctx.orgId,
      type: "task.assigned",
      message: `Você foi atribuído à tarefa "${task.title}".`,
      link: `/org/${ctx.orgSlug}/projects/${task.projectId}`,
    });
  }

  return task;
}
