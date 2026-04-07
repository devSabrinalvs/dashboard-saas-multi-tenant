import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { TaskBulkActionInput } from "@/schemas/task";

/**
 * Mutation para ações em lote em tasks.
 * Usa o endpoint PATCH /api/org/[orgSlug]/tasks/bulk.
 * Após sucesso, invalida o cache das tasks do projeto.
 */
export function useBulkTaskAction(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskBulkActionInput) =>
      apiClient.patch<{ count: number }>(
        `/api/org/${orgSlug}/tasks/bulk`,
        body
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", orgSlug, projectId],
      });
      // Também invalida contagens do dashboard se estiverem em cache
      void queryClient.invalidateQueries({
        queryKey: ["dashboard", "open-tasks", orgSlug],
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboard", "done-this-week", orgSlug],
      });
    },
  });
}
