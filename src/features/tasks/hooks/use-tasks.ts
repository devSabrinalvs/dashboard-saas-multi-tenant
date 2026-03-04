import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { PaginatedResult, Task } from "@/server/repo/task-repo";

export type TasksQueryParams = {
  search?: string;
  status?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
};

export function useTasks(
  orgSlug: string,
  projectId: string,
  params: TasksQueryParams = {}
) {
  return useQuery({
    queryKey: ["tasks", orgSlug, projectId, params],
    queryFn: () =>
      apiClient.get<PaginatedResult<Task>>(
        `/api/org/${orgSlug}/projects/${projectId}/tasks`,
        params as Record<string, unknown>
      ),
  });
}
