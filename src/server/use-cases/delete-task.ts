import type { OrgContext } from "@/server/org/require-org-context";
import { findTaskById, deleteTask as repoDeleteTask, type Task } from "@/server/repo/task-repo";
import { TaskNotFoundError } from "@/server/errors/project-errors";

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

  // TODO(Etapa 8 - Audit): log("task.deleted", { orgId: ctx.orgId, taskId, actorId: ctx.userId })

  return deleted;
}
