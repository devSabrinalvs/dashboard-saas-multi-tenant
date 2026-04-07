import type { OrgContext } from "@/server/org/require-org-context";
import {
  listTasksByOrg as repoListOrgTasks,
  type PaginatedResult,
  type Task,
} from "@/server/repo/task-repo";
import type { TaskStatus } from "@/generated/prisma/enums";

export type OrgTaskQuery = {
  search?: string;
  status?: TaskStatus;
  open?: boolean;
  tag?: string;
  updatedAfter?: string; // ISO 8601
  page: number;
  pageSize: number;
};

/**
 * Lista tasks de toda a organização (cross-project) com filtros e paginação.
 * Não requer projectId — útil para dashboards e visões aggregadas.
 */
export async function listOrgTasks(
  ctx: OrgContext,
  query: OrgTaskQuery
): Promise<PaginatedResult<Task>> {
  return repoListOrgTasks({
    orgId: ctx.orgId,
    search: query.search,
    status: query.status,
    open: query.open,
    tag: query.tag,
    updatedAfter: query.updatedAfter
      ? new Date(query.updatedAfter)
      : undefined,
    page: query.page,
    pageSize: query.pageSize,
  });
}
