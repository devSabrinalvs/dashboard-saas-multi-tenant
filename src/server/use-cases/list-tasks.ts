import type { OrgContext } from "@/server/org/require-org-context";
import {
  listTasksByProject as repoListTasks,
  type PaginatedResult,
  type Task,
} from "@/server/repo/task-repo";
import type { TaskStatus } from "@/generated/prisma/enums";
import { getProject } from "./get-project";

export type TaskQuery = {
  search?: string;
  status?: TaskStatus;
  tag?: string;
  /** Se fornecido, filtra tasks atribuídas a este userId */
  assigneeUserId?: string;
  page: number;
  pageSize: number;
};

/**
 * Lista tasks de um projeto com filtros e paginação.
 * Verifica que o projeto pertence à org antes de listar.
 *
 * @throws ProjectNotFoundError se o projeto não existir ou for de outra org.
 */
export async function listTasksByProject(
  ctx: OrgContext,
  projectId: string,
  query: TaskQuery
): Promise<PaginatedResult<Task>> {
  // Verifica cross-tenant: projeto deve pertencer à org
  await getProject(ctx, projectId);

  return repoListTasks({
    orgId: ctx.orgId,
    projectId,
    search: query.search,
    status: query.status,
    tag: query.tag,
    assigneeUserId: query.assigneeUserId,
    page: query.page,
    pageSize: query.pageSize,
  });
}
