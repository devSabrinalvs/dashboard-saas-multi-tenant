import type { OrgContext } from "@/server/org/require-org-context";
import { findTaskById, updateTask as repoUpdateTask, type Task } from "@/server/repo/task-repo";
import type { TaskStatus } from "@/generated/prisma/enums";
import { TaskNotFoundError } from "@/server/errors/project-errors";
import { logAudit } from "@/server/audit/log-audit";

export type UpdateTaskData = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  tags?: string[];
};

/**
 * Atualiza uma task verificando pertencimento à org.
 *
 * Pré-condição: chamador já verificou permissão "task:update" via assertPermission.
 *
 * @throws TaskNotFoundError se a task não existir ou for de outra org.
 */
export async function updateTask(
  ctx: OrgContext,
  taskId: string,
  data: UpdateTaskData
): Promise<Task> {
  const existing = await findTaskById(taskId, ctx.orgId);
  if (!existing) throw new TaskNotFoundError();

  const task = await repoUpdateTask(taskId, data);

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "task.updated",
    metadata: { taskId, changes: data },
  });

  return task;
}
