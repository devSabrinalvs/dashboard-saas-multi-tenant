import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { PaginatedResult, Task } from "@/server/repo/task-repo";

/**
 * Busca as tasks abertas (TODO + IN_PROGRESS) de toda a org,
 * ordenadas por updatedAt DESC — "My work" no dashboard.
 * Limita a pageSize=10 e exibe os primeiros itens no cliente.
 */
export function useMyOpenTasks(orgSlug: string) {
  return useQuery({
    queryKey: ["dashboard", "my-open-tasks", orgSlug],
    queryFn: () =>
      apiClient.get<PaginatedResult<Task>>(
        `/api/org/${orgSlug}/tasks`,
        { open: "true", page: "1", pageSize: "10" }
      ),
  });
}
