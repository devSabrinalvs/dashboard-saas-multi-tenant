import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { PaginatedResult, Project } from "@/server/repo/project-repo";

export type ProjectsQueryParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export function useProjects(orgSlug: string, params: ProjectsQueryParams = {}) {
  return useQuery({
    queryKey: ["projects", orgSlug, params],
    queryFn: () =>
      apiClient.get<PaginatedResult<Project>>(
        `/api/org/${orgSlug}/projects`,
        params as Record<string, unknown>
      ),
  });
}
