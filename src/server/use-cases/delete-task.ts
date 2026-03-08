import type { OrgContext } from "@/server/org/require-org-context";
import { findTaskById, deleteTask as repoDeleteTask, type Task } from "@/server/repo/task-repo";
import { TaskNotFoundError } from "@/server/errors/project-errors";
import { logAudit } from "@/server/audit/log-audit";

/**
 * Deleta uma task verificando pertencimento à org.
 *
 * Pré-condição: chamador já verificou permissão "task:delete" via assertPermission.
 *
 * @throws TaskNotFoundError se a task não existir ou for de outra org.
 */
export async function deleteTask(
  ctx: OrgContext,
  taskId: string
): Promise<Task> {
  const existing = await findTaskById(taskId, ctx.orgId);
  if (!existing) throw new TaskNotFoundError();

  const deleted = await repoDeleteTask(taskId);

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "task.deleted",
    metadata: { taskId, projectId: deleted.projectId },
  });

  return deleted;
}
