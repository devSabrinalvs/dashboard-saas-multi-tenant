"use client";

import { useState, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import type { TaskStatus } from "@/features/tasks/hooks/use-kanban-tasks";

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanQuickAddProps {
  orgSlug: string;
  projectId: string;
  status: TaskStatus;
  /** Se fornecido, a tarefa criada será atribuída a este userId */
  assigneeUserId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Formulário de criação rápida de tarefa inline, ancorado numa coluna Kanban.
 *
 * - Clique em "+ Adicionar tarefa" expande um input
 * - Enter / botão "Adicionar" cria via POST /tasks com o status da coluna
 * - Escape cancela
 * - Atualiza o cache via invalidateQueries (QueryClient)
 */
export function KanbanQuickAdd({
  orgSlug,
  projectId,
  status,
  assigneeUserId,
}: KanbanQuickAddProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateTask(orgSlug, projectId);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleCancel() {
    setOpen(false);
    setTitle("");
  }

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;

    createMutation.mutate(
      { title: trimmed, status, tags: [], assigneeUserId: assigneeUserId ?? null },
      {
        onSuccess: () => {
          setTitle("");
          setOpen(false);
          toast.success("Tarefa criada");
        },
        onError: () => {
          toast.error("Erro ao criar tarefa. Tente novamente.");
        },
      }
    );
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={handleOpen}
        data-testid={`kanban-quick-add-btn-${status}`}
      >
        <Plus className="size-4" />
        Adicionar tarefa
      </Button>
    );
  }

  return (
    <div
      className="rounded-lg border bg-card p-2 space-y-2 shadow-sm"
      data-testid={`kanban-quick-add-form-${status}`}
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="Título da tarefa…"
        className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
        disabled={createMutation.isPending}
        maxLength={200}
        data-testid={`kanban-quick-add-input-${status}`}
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={createMutation.isPending || !title.trim()}
          data-testid={`kanban-quick-add-submit-${status}`}
        >
          {createMutation.isPending && (
            <Loader2 className="size-3 animate-spin" />
          )}
          Adicionar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={createMutation.isPending}
          data-testid={`kanban-quick-add-cancel-${status}`}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
