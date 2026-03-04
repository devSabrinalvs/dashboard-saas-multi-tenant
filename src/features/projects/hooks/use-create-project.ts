import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Project } from "@/server/repo/project-repo";
import type { ProjectCreateInput } from "@/schemas/project";

export function useCreateProject(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectCreateInput) =>
      apiClient.post<{ project: Project }>(
        `/api/org/${orgSlug}/projects`,
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["projects", orgSlug],
      });
    },
  });
}
