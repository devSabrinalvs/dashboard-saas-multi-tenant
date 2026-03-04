import type { OrgContext } from "@/server/org/require-org-context";
import { createTask as repoCreateTask, type Task } from "@/server/repo/task-repo";
import type { TaskStatus } from "@/generated/prisma/enums";
import { getProject } from "./get-project";

export type CreateTaskData = {
  title: string;
  description?: string;
  status?: TaskStatus;
  tags?: string[];
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

  const task = await repoCreateTask({
    orgId: ctx.orgId,
    projectId,
    title: data.title,
    description: data.description,
    status: data.status,
    tags: data.tags,
  });

  // TODO(Etapa 8 - Audit): log("task.created", { orgId: ctx.orgId, projectId, taskId: task.id, actorId: ctx.userId })

  return task;
}
