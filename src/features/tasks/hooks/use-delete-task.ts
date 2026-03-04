import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export function useDeleteTask(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiClient.delete<{ ok: boolean }>(
        `/api/org/${orgSlug}/tasks/${taskId}`
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", orgSlug, projectId],
      });
    },
  });
}
