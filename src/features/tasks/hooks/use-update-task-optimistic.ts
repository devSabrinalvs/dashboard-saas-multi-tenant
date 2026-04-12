import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/shared/api/client";
import type { Task, PaginatedResult } from "@/server/repo/task-repo";
import type { TaskUpdateInput } from "@/schemas/task";

/**
 * Mutation com optimistic update para edição inline de tasks.
 *
 * Fluxo:
 *  1. onMutate: cancela refetches, guarda estado anterior, aplica update otimista
 *  2. onError: reverte para estado anterior + toast de erro
 *  3. onSettled: invalida cache para garantir consistência com o servidor
 */
export function useUpdateTaskOptimistic(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["tasks", orgSlug, projectId] as const;

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

    onMutate: async ({ taskId, data }) => {
      // Cancela qualquer refetch em andamento
      await queryClient.cancelQueries({ queryKey });

      // Guarda snapshot de TODAS as entradas do cache que batem com a queryKey
      const previousSnapshots = queryClient.getQueriesData<
        PaginatedResult<Task>
      >({ queryKey });

      // Aplica update otimista em todas as páginas cacheadas
      queryClient.setQueriesData<PaginatedResult<Task>>(
        { queryKey },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((t) => {
              if (t.id !== taskId) return t;
              const { dueDate, ...rest } = data;
              return {
                ...t,
                ...rest,
                ...(dueDate !== undefined
                  ? { dueDate: dueDate ? new Date(dueDate) : null }
                  : {}),
              };
            }),
          };
        }
      );

      return { previousSnapshots };
    },

    onError: (_err, _vars, context) => {
      // Reverte para o estado anterior
      if (context?.previousSnapshots) {
        for (const [key, data] of context.previousSnapshots) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Erro ao salvar alteração. Tente novamente.");
    },

    onSuccess: () => {
      toast.success("Tarefa atualizada");
    },

    onSettled: () => {
      // Garante consistência com o servidor mesmo se o update otimista divergiu
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
