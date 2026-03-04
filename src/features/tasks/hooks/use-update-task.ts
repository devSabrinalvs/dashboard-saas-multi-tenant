import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Task } from "@/server/repo/task-repo";
import type { TaskUpdateInput } from "@/schemas/task";

export function useUpdateTask(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: TaskUpdateInput;
    }) =>
      apiClient.patch<{ task: Task }>(
        `/api/org/${orgSlug}/tasks/${taskId}`,
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", orgSlug, projectId],
      });
    },
  });
}
