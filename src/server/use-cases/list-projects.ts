import type { OrgContext } from "@/server/org/require-org-context";
import {
  listProjects as repoListProjects,
  type PaginatedResult,
  type Project,
} from "@/server/repo/project-repo";

export type ProjectQuery = {
  search?: string;
  page: number;
  pageSize: number;
};

/**
 * Lista projetos da organização com filtros e paginação.
 * Nenhuma permissão especial exigida — VIEWER também pode listar.
 */
export async function listProjects(
  ctx: OrgContext,
  query: ProjectQuery
): Promise<PaginatedResult<Project>> {
  return repoListProjects({
    orgId: ctx.orgId,
    search: query.search,
    page: query.page,
    pageSize: query.pageSize,
  });
}
