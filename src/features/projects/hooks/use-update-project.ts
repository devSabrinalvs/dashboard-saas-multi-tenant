import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Project } from "@/server/repo/project-repo";
import type { ProjectUpdateInput } from "@/schemas/project";

export function useUpdateProject(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: ProjectUpdateInput;
    }) =>
      apiClient.patch<{ project: Project }>(
        `/api/org/${orgSlug}/projects/${projectId}`,
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["projects", orgSlug],
      });
    },
  });
}
