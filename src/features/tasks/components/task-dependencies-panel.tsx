"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiClient } from "@/shared/api/client";

interface DepTask {
  id: string;
  blockingTaskId?: string;
  blockedTaskId?: string;
  title: string;
}

interface DepsData {
  blocking: DepTask[];   // tasks that this task is blocking
  blockedBy: DepTask[];  // tasks that block this task
}

interface Props {
  orgSlug: string;
  taskId: string;
  canUpdate?: boolean;
}

export function TaskDependenciesPanel({ orgSlug, taskId, canUpdate = false }: Props) {
  const queryClient = useQueryClient();
  const baseUrl = `/api/org/${orgSlug}/tasks/${taskId}/dependencies`;
  const queryKey = ["dependencies", orgSlug, taskId] as const;

  const [blockingIdInput, setBlockingIdInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiClient.get<DepsData>(baseUrl),
  });

  const addMutation = useMutation({
    mutationFn: (blockingTaskId: string) =>
      apiClient.post(baseUrl, { blockingTaskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setBlockingIdInput("");
      toast.success("Dependência adicionada");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao adicionar dependência."),
  });

  const removeMutation = useMutation({
    mutationFn: (depId: string) =>
      apiClient.delete(`${baseUrl}/${depId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success("Dependência removida");
    },
    onError: () => toast.error("Erro ao remover dependência."),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Carregando…
      </div>
    );
  }

  const blockedBy = data?.blockedBy ?? [];
  const blocking = data?.blocking ?? [];

  return (
    <div className="space-y-3">
      {/* Bloqueada por */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Bloqueada por</p>
        {blockedBy.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma dependência</p>
        ) : (
          <ul className="space-y-1">
            {blockedBy.map((dep) => (
              <li key={dep.id} className="flex items-center gap-1.5 text-xs">
                <Link2 className="size-3 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{dep.title}</span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {dep.blockingTaskId?.slice(-6)}
                </span>
                {canUpdate && (
                  <button
                    className="p-0.5 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMutation.mutate(dep.id)}
                    disabled={removeMutation.isPending}
                    aria-label="Remover dependência"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bloqueia */}
      {blocking.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Bloqueia</p>
          <ul className="space-y-1">
            {blocking.map((dep) => (
              <li key={dep.id} className="flex items-center gap-1.5 text-xs">
                <Link2 className="size-3 text-orange-500 shrink-0" />
                <span className="flex-1 truncate">{dep.title}</span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {dep.blockedTaskId?.slice(-6)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Adicionar dependência */}
      {canUpdate && (
        <div className="flex gap-1.5 items-center pt-1">
          <Input
            className="h-7 text-xs font-mono"
            placeholder="ID da tarefa bloqueante"
            value={blockingIdInput}
            onChange={(e) => setBlockingIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && blockingIdInput.trim()) {
                e.preventDefault();
                addMutation.mutate(blockingIdInput.trim());
              }
            }}
            disabled={addMutation.isPending}
            maxLength={32}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs px-2"
            onClick={() => blockingIdInput.trim() && addMutation.mutate(blockingIdInput.trim())}
            disabled={addMutation.isPending || !blockingIdInput.trim()}
          >
            {addMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}
