import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Task } from "@/server/repo/task-repo";
import type { TaskCreateInput } from "@/schemas/task";

export function useCreateTask(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TaskCreateInput) =>
      apiClient.post<{ task: Task }>(
        `/api/org/${orgSlug}/projects/${projectId}/tasks`,
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", orgSlug, projectId],
      });
    },
  });
}
