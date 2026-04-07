import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { PaginatedResult, Task } from "@/server/repo/task-repo";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";
export type KanbanColumns = Record<TaskStatus, Task[]>;

const ALL_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"];

/**
 * Busca tarefas para o Kanban (pageSize: 50) e as agrupa por status.
 *
 * O queryKey inclui `{ pageSize: 50 }` mas ainda começa com
 * `["tasks", orgSlug, projectId]`, o que garante que o optimistic update
 * de `useUpdateTaskOptimistic` (que usa esse prefixo) atualize este cache
 * automaticamente ao mover cards entre colunas.
 *
 * Limitação: exibe no máximo 50 tarefas por fetch.
 */
export function useKanbanTasks(
  orgSlug: string,
  projectId: string,
  options: { assignedToMe?: boolean } = {}
) {
  const params: Record<string, unknown> = { pageSize: 50 };
  if (options.assignedToMe) params.assignedTo = "me";

  const query = useQuery({
    queryKey: ["tasks", orgSlug, projectId, params],
    queryFn: () =>
      apiClient.get<PaginatedResult<Task>>(
        `/api/org/${orgSlug}/projects/${projectId}/tasks`,
        params
      ),
  });

  const columns = useMemo<KanbanColumns>(() => {
    const cols: KanbanColumns = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
      CANCELED: [],
    };

    if (query.data) {
      for (const task of query.data.items) {
        const s = task.status as TaskStatus;
        if (ALL_STATUSES.includes(s)) {
          cols[s].push(task);
        }
      }
    }

    return cols;
  }, [query.data]);

  return { ...query, columns };
}
