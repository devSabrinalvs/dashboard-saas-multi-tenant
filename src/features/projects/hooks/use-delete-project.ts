import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export function useDeleteProject(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      apiClient.delete<{ ok: boolean }>(
        `/api/org/${orgSlug}/projects/${projectId}`
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["projects", orgSlug],
      });
    },
  });
}
