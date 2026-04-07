import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { PaginatedResult } from "@/server/repo/project-repo";
import type { Task } from "@/server/repo/task-repo";
import type { Project } from "@/server/repo/project-repo";

export type DashboardSummary = {
  projectsTotal: number;
  openTasksTotal: number;
  doneThisWeekTotal: number;
};

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

/**
 * Agrega 3 queries paralelas para montar os KPIs principais do dashboard:
 *  - total de projetos
 *  - tasks abertas (TODO + IN_PROGRESS)
 *  - tasks concluídas nos últimos 7 dias (DONE + updatedAt >= now-7d)
 *
 * Limitação conhecida: "Done this week" usa `updatedAt` como proxy para
 * data de conclusão. Se uma task DONE for editada, `updatedAt` avança.
 * Isso pode levar a uma leve supercontagem em casos de edição pós-conclusão.
 */
export function useDashboardSummary(orgSlug: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: ["dashboard", "projects-total", orgSlug],
        queryFn: () =>
          apiClient.get<PaginatedResult<Project>>(
            `/api/org/${orgSlug}/projects`,
            { page: "1", pageSize: "10" }
          ),
      },
      {
        queryKey: ["dashboard", "open-tasks", orgSlug],
        queryFn: () =>
          apiClient.get<PaginatedResult<Task>>(
            `/api/org/${orgSlug}/tasks`,
            { open: "true", page: "1", pageSize: "10" }
          ),
      },
      {
        queryKey: ["dashboard", "done-this-week", orgSlug],
        queryFn: () =>
          apiClient.get<PaginatedResult<Task>>(
            `/api/org/${orgSlug}/tasks`,
            { status: "DONE", updatedAfter: sevenDaysAgo(), page: "1", pageSize: "10" }
          ),
      },
    ],
  });

  const [projectsQ, openTasksQ, doneWeekQ] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const summary: DashboardSummary | undefined =
    projectsQ.data && openTasksQ.data && doneWeekQ.data
      ? {
          projectsTotal: projectsQ.data.total,
          openTasksTotal: openTasksQ.data.total,
          doneThisWeekTotal: doneWeekQ.data.total,
        }
      : undefined;

  return { summary, isLoading, isError, errors };
}
