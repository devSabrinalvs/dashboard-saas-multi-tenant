"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCheck,
  Trash2,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBulkTaskAction } from "@/features/tasks/hooks/use-bulk-task-action";
import type { TaskStatus } from "@/generated/prisma/enums";

const STATUS_LABELS: Record<string, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
  CANCELED: "Cancelado",
};

interface TaskBulkActionBarProps {
  orgSlug: string;
  projectId: string;
  selectedIds: string[];
  onClear: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}

export function TaskBulkActionBar({
  orgSlug,
  projectId,
  selectedIds,
  onClear,
  canUpdate,
  canDelete,
}: TaskBulkActionBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const bulkMutation = useBulkTaskAction(orgSlug, projectId);

  if (selectedIds.length === 0) return null;

  function handleSetStatus(status: string) {
    bulkMutation.mutate(
      {
        action: "setStatus",
        taskIds: selectedIds,
        status: status as TaskStatus,
      },
      {
        onSuccess: ({ count }) => {
          toast.success(
            `${count} tarefa${count !== 1 ? "s" : ""} atualizada${count !== 1 ? "s" : ""}`
          );
          onClear();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erro ao atualizar tarefas");
        },
      }
    );
  }

  function handleDelete() {
    bulkMutation.mutate(
      { action: "delete", taskIds: selectedIds },
      {
        onSuccess: ({ count }) => {
          toast.success(
            `${count} tarefa${count !== 1 ? "s" : ""} excluída${count !== 1 ? "s" : ""}`
          );
          onClear();
          setDeleteDialogOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erro ao excluir tarefas");
          setDeleteDialogOpen(false);
        },
      }
    );
  }

  const isPending = bulkMutation.isPending;

  return (
    <>
      <div
        className="flex items-center gap-3 rounded-lg border bg-background px-4 py-2.5 shadow-md"
        data-testid="bulk-action-bar"
        role="toolbar"
        aria-label="Ações em lote"
      >
        {/* Counter + clear */}
        <span className="text-sm font-medium tabular-nums">
          {selectedIds.length} selecionada{selectedIds.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          title="Limpar seleção"
          disabled={isPending}
        >
          <X className="size-4" />
          <span className="sr-only">Limpar seleção</span>
        </Button>

        <div className="mx-1 h-4 w-px bg-border" aria-hidden />

        {/* Quick: Mark as DONE */}
        {canUpdate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSetStatus("DONE")}
            disabled={isPending}
            data-testid="bulk-mark-done"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            Marcar DONE
          </Button>
        )}

        {/* Change status dropdown */}
        {canUpdate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                data-testid="bulk-status-dropdown"
              >
                Status
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => handleSetStatus(value)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Delete */}
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isPending}
            data-testid="bulk-delete-btn"
          >
            <Trash2 className="size-4" />
            Excluir
          </Button>
        )}
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} tarefa{selectedIds.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As tarefas serão permanentemente
              removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
