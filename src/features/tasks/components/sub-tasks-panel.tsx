"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiClient } from "@/shared/api/client";
import type { Task } from "@/server/repo/task-repo";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTask = Task;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubTasksPanelProps {
  orgSlug: string;
  taskId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SubTasksPanel({
  orgSlug,
  taskId,
  canCreate,
  canUpdate,
  canDelete,
}: SubTasksPanelProps) {
  const queryClient = useQueryClient();
  const queryKey = ["subtasks", orgSlug, taskId] as const;
  const baseUrl = `/api/org/${orgSlug}/tasks/${taskId}/subtasks`;

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiClient.get<{ subTasks: SubTask[] }>(baseUrl).then((r) => r.subTasks),
  });

  const subTasks = data ?? [];
  const total = subTasks.length;
  const done = subTasks.filter((s) => s.status === "DONE").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Create ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient.post<{ subTask: SubTask }>(baseUrl, { title }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setNewTitle("");
      setAdding(false);
      toast.success("Sub-tarefa criada");
    },
    onError: () => toast.error("Erro ao criar sub-tarefa."),
  });

  // ── Toggle status ─────────────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ subTaskId, checked }: { subTaskId: string; checked: boolean }) =>
      apiClient.patch<{ subTask: SubTask }>(`${baseUrl}/${subTaskId}`, {
        status: checked ? "DONE" : "TODO",
      }),
    onMutate: async ({ subTaskId, checked }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<SubTask[]>(queryKey);
      queryClient.setQueryData<SubTask[]>(queryKey, (old) =>
        old?.map((s) =>
          s.id === subTaskId ? { ...s, status: checked ? "DONE" : "TODO" } : s
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error("Erro ao atualizar sub-tarefa.");
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (subTaskId: string) =>
      apiClient.delete(`${baseUrl}/${subTaskId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success("Sub-tarefa removida");
    },
    onError: () => toast.error("Erro ao remover sub-tarefa."),
  });

  function handleAddOpen() {
    setAdding(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleAddSubmit() {
    const trimmed = newTitle.trim();
    if (trimmed.length < 2) return;
    createMutation.mutate(trimmed);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header + progress */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sub-tarefas</span>
            <span>{done}/{total}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Carregando…
        </div>
      )}

      {/* List */}
      {!isLoading && subTasks.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">Nenhuma sub-tarefa ainda.</p>
      )}

      <ul className="space-y-1.5">
        {subTasks.map((sub) => (
          <li
            key={sub.id}
            className="flex items-center gap-2 group"
          >
            <Checkbox
              checked={sub.status === "DONE"}
              onCheckedChange={(checked) => {
                if (!canUpdate) return;
                toggleMutation.mutate({ subTaskId: sub.id, checked: !!checked });
              }}
              disabled={!canUpdate}
              aria-label={`Marcar "${sub.title}" como ${sub.status === "DONE" ? "pendente" : "concluída"}`}
            />
            <span
              className={`flex-1 text-sm ${
                sub.status === "DONE" ? "line-through text-muted-foreground" : ""
              }`}
            >
              {sub.title}
            </span>
            {canDelete && (
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                onClick={() => deleteMutation.mutate(sub.id)}
                disabled={deleteMutation.isPending}
                aria-label={`Remover sub-tarefa "${sub.title}"`}
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Add input */}
      {adding && (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAddSubmit(); }
              if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
            }}
            placeholder="Título da sub-tarefa…"
            className="h-7 text-sm"
            maxLength={200}
            disabled={createMutation.isPending}
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleAddSubmit}
            disabled={createMutation.isPending || newTitle.trim().length < 2}
          >
            {createMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : "Adicionar"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setAdding(false); setNewTitle(""); }}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Add button */}
      {canCreate && !adding && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={handleAddOpen}
        >
          <Plus className="size-3" />
          Adicionar sub-tarefa
        </Button>
      )}
    </div>
  );
}
