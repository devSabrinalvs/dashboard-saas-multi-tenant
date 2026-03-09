"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskFormModal } from "./task-form-modal";
import { useTasks } from "@/features/tasks/hooks/use-tasks";
import { useDeleteTask } from "@/features/tasks/hooks/use-delete-task";
import type { Task } from "@/server/repo/task-repo";

const STATUS_LABELS: Record<string, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
  CANCELED: "Cancelado",
};

type ValidStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";

function isValidStatus(s: string): s is ValidStatus {
  return s in STATUS_LABELS;
}

interface TasksSectionProps {
  orgSlug: string;
  projectId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function TasksSection({
  orgSlug,
  projectId,
  canCreate,
  canUpdate,
  canDelete,
}: TasksSectionProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const { data, isLoading, error } = useTasks(orgSlug, projectId, {
    search: search || undefined,
    status: status || undefined,
    tag: tag || undefined,
    page,
    pageSize,
  });

  const deleteMutation = useDeleteTask(orgSlug, projectId);

  function handleEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleNew() {
    setEditingTask(undefined);
    setModalOpen(true);
  }

  function handleDelete(task: Task) {
    if (
      !confirm(
        `Excluir tarefa "${task.title}"? Esta ação não pode ser desfeita.`
      )
    )
      return;
    deleteMutation.mutate(task.id);
  }

  function handleModalClose(open: boolean) {
    setModalOpen(open);
    if (!open) setEditingTask(undefined);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value === "ALL" ? "" : value);
    setPage(1);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tarefas</h2>
        {canCreate && (
          <Button size="sm" onClick={handleNew}>
            <Plus className="size-4" />
            Nova Tarefa
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar tarefas…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status || "ALL"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Filtrar por tag…"
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            setPage(1);
          }}
          className="max-w-36"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">
          Erro ao carregar tarefas: {error.message}
        </p>
      )}

      {/* Empty */}
      {!isLoading && !error && data?.items.length === 0 && (
        <EmptyState
          icon={ListTodo}
          title="Nenhuma tarefa encontrada"
          subtitle={
            search || status || tag
              ? "Nenhuma tarefa corresponde aos filtros aplicados"
              : canCreate
                ? `Crie a primeira tarefa clicando em "Nova Tarefa"`
                : undefined
          }
        />
      )}

      {/* Table */}
      {!isLoading && !error && (data?.items.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Título
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Tags
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Criado em
                </th>
                <th className="w-24 px-4 py-3 text-right font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.items.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground max-w-xs">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {isValidStatus(task.status) ? (
                      <StatusBadge status={task.status} />
                    ) : (
                      <Badge variant="outline">{task.status}</Badge>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {task.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          >
                            {t}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{task.tags.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {new Date(task.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(task)}
                          title="Editar tarefa"
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(task)}
                          title="Excluir tarefa"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4 text-destructive" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} tarefa{data.total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Badge variant="outline">
              {page} / {data.totalPages}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <TaskFormModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        orgSlug={orgSlug}
        projectId={projectId}
        task={editingTask}
      />
    </section>
  );
}
