"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ListTodo, List, LayoutDashboard, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TaskFormModal } from "./task-form-modal";
import { TaskBulkActionBar } from "./task-bulk-action-bar";
import { InlineTitle, InlineStatus, InlineTags } from "./task-inline-editor";
import { SavedFiltersMenu } from "./saved-filters-menu";
import { KanbanBoard } from "./kanban/kanban-board";
import { AssigneeAvatar, NoAssigneeAvatar } from "./assignee-avatar";
import { useTasks } from "@/features/tasks/hooks/use-tasks";
import { useOrgMembers } from "@/features/tasks/hooks/use-org-members";
import { useTaskSelection } from "@/features/tasks/hooks/use-task-selection";
import { useSavedFilters } from "@/features/tasks/hooks/use-saved-filters";
import { cn } from "@/lib/utils";
import type { Task } from "@/server/repo/task-repo";
import type { FilterState } from "@/features/tasks/hooks/use-saved-filters";

// ─── Debounce ────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── View persistence ─────────────────────────────────────────────────────────

type ViewMode = "list" | "kanban";

function getStoredView(orgSlug: string, projectId: string): ViewMode {
  if (typeof window === "undefined") return "list";
  const key = `kanban-view:${orgSlug}:${projectId}`;
  const stored = localStorage.getItem(key);
  return stored === "kanban" ? "kanban" : "list";
}

function setStoredView(orgSlug: string, projectId: string, view: ViewMode) {
  if (typeof window === "undefined") return;
  const key = `kanban-view:${orgSlug}:${projectId}`;
  localStorage.setItem(key, view);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
  CANCELED: "Cancelado",
};

const DEFAULT_FILTERS: FilterState = {
  search: "",
  status: "",
  tag: "",
  pageSize: 10,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TasksSectionProps {
  orgSlug: string;
  projectId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  currentUserId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TasksSection({
  orgSlug,
  projectId,
  canCreate,
  canUpdate,
  canDelete,
  currentUserId,
}: TasksSectionProps) {
  // ── View mode ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>("list");

  // Hidrata a preferência do localStorage após montagem (evita SSR mismatch)
  useEffect(() => {
    setView(getStoredView(orgSlug, projectId));
  }, [orgSlug, projectId]);

  function handleViewChange(newView: ViewMode) {
    setView(newView);
    setStoredView(orgSlug, projectId, newView);
  }

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const debouncedSearch = useDebounce(search, 350);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  // ── Saved filters ─────────────────────────────────────────────────────────
  const { getDefault } = useSavedFilters(orgSlug, projectId);

  const [defaultApplied, setDefaultApplied] = useState(false);
  useEffect(() => {
    if (defaultApplied) return;
    setDefaultApplied(true);
    const def = getDefault();
    if (def) {
      setSearch(def.search ?? "");
      setStatus(def.status ?? "");
      setTag(def.tag ?? "");
    }
  }, [getDefault, defaultApplied]);

  // ── Members (para exibir avatares na tabela) ──────────────────────────────
  const { data: membersData } = useOrgMembers(orgSlug);
  const membersById = Object.fromEntries(
    (membersData ?? []).map((m) => [m.userId, m])
  );

  // ── Data fetching (apenas no modo lista) ──────────────────────────────────
  const { data, isLoading, error, refetch } = useTasks(orgSlug, projectId, {
    search: debouncedSearch || undefined,
    status: status || undefined,
    tag: tag || undefined,
    assignedTo: assignedToMe ? "me" : undefined,
    page,
    pageSize,
  });

  // ── Selection ─────────────────────────────────────────────────────────────
  const {
    selected,
    toggle,
    selectAll,
    clearAll,
    isAllSelected,
    isIndeterminate,
  } = useTaskSelection();

  const currentIds = data?.items.map((t) => t.id) ?? [];
  const allSelected = isAllSelected(currentIds);
  const indeterminate = isIndeterminate(currentIds);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    clearAll();
  }

  function handleStatusChange(value: string) {
    setStatus(value === "ALL" ? "" : value);
    setPage(1);
    clearAll();
  }

  function handleTagChange(value: string) {
    setTag(value);
    setPage(1);
    clearAll();
  }

  const applyFilters = useCallback(
    (filters: FilterState) => {
      setSearch(filters.search ?? "");
      setStatus(filters.status ?? "");
      setTag(filters.tag ?? "");
      setPage(1);
      clearAll();
    },
    [clearAll]
  );

  function resetFilters() {
    applyFilters(DEFAULT_FILTERS);
    setAssignedToMe(false);
  }

  function handleAssignedToMeToggle() {
    setAssignedToMe((v) => !v);
    setPage(1);
    clearAll();
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleNew() {
    setEditingTask(undefined);
    setModalOpen(true);
  }

  function handleModalClose(open: boolean) {
    setModalOpen(open);
    if (!open) setEditingTask(undefined);
  }

  const hasFilters = Boolean(search || status || tag || assignedToMe);
  const selectedArray = [...selected];
  const hasBulkSelection = selectedArray.length > 0;

  return (
    <section className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Tarefas</h2>

          {/* View toggle */}
          <div
            className="flex items-center rounded-lg border bg-muted/40 p-0.5"
            role="group"
            aria-label="Modo de visualização"
            data-testid="view-toggle"
          >
            <button
              onClick={() => handleViewChange("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={view === "list"}
              data-testid="view-toggle-list"
            >
              <List className="size-3.5" />
              Lista
            </button>
            <button
              onClick={() => handleViewChange("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={view === "kanban"}
              data-testid="view-toggle-kanban"
            >
              <LayoutDashboard className="size-3.5" />
              Kanban
            </button>
          </div>
        </div>

        {canCreate && (
          <Button size="sm" onClick={handleNew} data-testid="new-task-btn">
            <Plus className="size-4" />
            Nova Tarefa
          </Button>
        )}
      </div>

      {/* ── Kanban view ─────────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <KanbanBoard
          orgSlug={orgSlug}
          projectId={projectId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          currentUserId={currentUserId}
          assignedToMe={assignedToMe}
          onAssignedToMeToggle={handleAssignedToMeToggle}
        />
      )}

      {/* ── List view ───────────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          {/* Filters toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar tarefas…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-xs"
              data-testid="task-search-input"
            />
            <Select
              value={status || "ALL"}
              onValueChange={handleStatusChange}
            >
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
              placeholder="Tag…"
              value={tag}
              onChange={(e) => handleTagChange(e.target.value)}
              className="max-w-28"
            />
            <Button
              variant={assignedToMe ? "default" : "outline"}
              size="sm"
              onClick={handleAssignedToMeToggle}
              className="gap-1.5"
              data-testid="assigned-to-me-toggle"
            >
              <UserRound className="size-4" />
              Minhas tarefas
            </Button>
            <SavedFiltersMenu
              orgSlug={orgSlug}
              projectId={projectId}
              currentFilters={{ search, status, tag, pageSize }}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </div>

          {/* Bulk action bar */}
          {hasBulkSelection && (
            <TaskBulkActionBar
              orgSlug={orgSlug}
              projectId={projectId}
              selectedIds={selectedArray}
              onClear={clearAll}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          )}

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
            <ErrorState
              description={`Erro ao carregar tarefas: ${error.message}`}
              onRetry={() => void refetch()}
            />
          )}

          {/* Empty */}
          {!isLoading && !error && data?.items.length === 0 && (
            <EmptyState
              icon={ListTodo}
              title={
                hasFilters
                  ? "Nenhuma tarefa encontrada"
                  : "Nenhuma tarefa ainda"
              }
              subtitle={
                hasFilters
                  ? "Nenhuma tarefa corresponde aos filtros aplicados. Tente ajustar os filtros."
                  : "Adicione tarefas para organizar e acompanhar o progresso deste projeto."
              }
              action={
                !hasFilters && canCreate ? (
                  <Button
                    size="sm"
                    onClick={handleNew}
                    data-testid="empty-tasks-cta"
                  >
                    <Plus className="size-4" />
                    Criar primeira tarefa
                  </Button>
                ) : undefined
              }
            />
          )}

          {/* Table */}
          {!isLoading && !error && (data?.items.length ?? 0) > 0 && (
            <div
              className="overflow-hidden rounded-xl border"
              data-testid="tasks-table"
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <Checkbox
                        checked={allSelected}
                        data-indeterminate={indeterminate}
                        onCheckedChange={(
                          checked: boolean | "indeterminate"
                        ) => {
                          if (checked === true) selectAll(currentIds);
                          else clearAll();
                        }}
                        aria-label="Selecionar todas as tarefas"
                        data-testid="select-all-checkbox"
                        className={
                          indeterminate
                            ? "data-[state=checked]:bg-primary/50"
                            : ""
                        }
                      />
                    </th>
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
                      Responsável
                    </th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground xl:table-cell">
                      Criado em
                    </th>
                    <th className="w-20 px-4 py-3 text-right font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.items.map((task) => {
                    const isSelected = selected.has(task.id);
                    return (
                      <tr
                        key={task.id}
                        className={`transition-colors hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}
                        data-testid={`task-row-${task.id}`}
                      >
                        <td
                          className="w-10 px-3 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggle(task.id)}
                            aria-label={`Selecionar tarefa ${task.title}`}
                            data-testid={`task-checkbox-${task.id}`}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <InlineTitle
                            task={task}
                            orgSlug={orgSlug}
                            projectId={projectId}
                            disabled={!canUpdate}
                          />
                          {task.description && (
                            <div className="mt-0.5 truncate text-xs text-muted-foreground max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </td>

                        <td className="hidden px-4 py-3 sm:table-cell">
                          <InlineStatus
                            task={task}
                            orgSlug={orgSlug}
                            projectId={projectId}
                            disabled={!canUpdate}
                          />
                        </td>

                        <td className="hidden px-4 py-3 md:table-cell">
                          <InlineTags
                            task={task}
                            orgSlug={orgSlug}
                            projectId={projectId}
                            disabled={!canUpdate}
                          />
                        </td>

                        <td className="hidden px-4 py-3 lg:table-cell">
                          {task.assigneeUserId ? (
                            (() => {
                              const member = membersById[task.assigneeUserId];
                              return member ? (
                                <AssigneeAvatar
                                  name={member.user.name}
                                  email={member.user.email}
                                  size={26}
                                />
                              ) : (
                                <NoAssigneeAvatar size={26} />
                              );
                            })()
                          ) : (
                            <NoAssigneeAvatar size={26} />
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                          {new Date(task.createdAt).toLocaleDateString("pt-BR")}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleEdit(task)}
                                title="Editar tarefa (modal)"
                              >
                                <span className="sr-only">Editar</span>
                                <svg
                                  className="size-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                  onClick={() => {
                    setPage((p) => p - 1);
                    clearAll();
                  }}
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
                  onClick={() => {
                    setPage((p) => p + 1);
                    clearAll();
                  }}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Form modal (compartilhado entre List e Kanban via header btn) ────── */}
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
