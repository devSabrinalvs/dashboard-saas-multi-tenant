"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { TaskFormModal } from "@/features/tasks/components/task-form-modal";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";
import {
  useKanbanTasks,
  type TaskStatus,
} from "@/features/tasks/hooks/use-kanban-tasks";
import { useUpdateTaskOptimistic } from "@/features/tasks/hooks/use-update-task-optimistic";
import { useOrgMembers } from "@/features/tasks/hooks/use-org-members";
import type { Task } from "@/server/repo/task-repo";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"];

const COLUMN_LABELS: Record<TaskStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
  CANCELED: "Cancelado",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  orgSlug: string;
  projectId: string;
  canCreate: boolean;
  canUpdate: boolean;
  currentUserId: string;
  assignedToMe: boolean;
  onAssignedToMeToggle: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Board Kanban completo com drag-and-drop via dnd-kit.
 *
 * Fluxo de drag:
 * 1. onDragStart → guarda `activeTask` para o DragOverlay
 * 2. onDragEnd → se status mudou, dispara `useUpdateTaskOptimistic`
 *    - optimistic update atualiza o cache (inclui esta query com prefixo)
 *    - onError faz rollback + toast
 * 3. DragOverlay renderiza cópia do card flutuando durante o drag
 *
 * Edição: botão de lápis no hover de cada card abre TaskFormModal.
 */
export function KanbanBoard({
  orgSlug,
  projectId,
  canCreate,
  canUpdate,
  currentUserId,
  assignedToMe,
  onAssignedToMeToggle,
}: KanbanBoardProps) {
  const { columns, isLoading, error, refetch } = useKanbanTasks(
    orgSlug,
    projectId,
    { assignedToMe }
  );
  const updateMutation = useUpdateTaskOptimistic(orgSlug, projectId);

  // ── Members (para avatares nos cards) ────────────────────────────────────
  const { data: membersData } = useOrgMembers(orgSlug);
  const membersById = Object.fromEntries(
    (membersData ?? []).map((m) => [m.userId, m])
  );

  // ── Drag state ───────────────────────────────────────────────────────────
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // ── Edit modal state ─────────────────────────────────────────────────────
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  // ── Sensors ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Requer 8px de movimento antes de ativar drag
      // evita conflito com cliques em botões internos
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);

      const { active, over } = event;
      if (!over || !canUpdate) return;

      const taskId = String(active.id);
      const newStatus = String(over.id) as TaskStatus;
      const task = active.data.current?.task as Task | undefined;

      if (!task) return;
      if (task.status === newStatus) return;
      if (!COLUMN_ORDER.includes(newStatus)) return;

      updateMutation.mutate({ taskId, data: { status: newStatus } });
    },
    [canUpdate, updateMutation]
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) setEditingTask(undefined);
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-skeleton">
        {COLUMN_ORDER.map((s) => (
          <div key={s} className="w-[280px] flex-shrink-0 space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <ErrorState
        description={`Erro ao carregar tarefas: ${error.message}`}
        onRetry={() => void refetch()}
      />
    );
  }

  // ── Board ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Filtro "Minhas tarefas" */}
      <div className="flex items-center gap-2">
        <Button
          variant={assignedToMe ? "default" : "outline"}
          size="sm"
          onClick={onAssignedToMeToggle}
          className="gap-1.5"
          data-testid="kanban-assigned-to-me-toggle"
        >
          <UserRound className="size-4" />
          Minhas tarefas
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Scroll horizontal em telas pequenas */}
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          data-testid="kanban-board"
        >
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              label={COLUMN_LABELS[status]}
              tasks={columns[status]}
              orgSlug={orgSlug}
              projectId={projectId}
              canCreate={canCreate}
              canUpdate={canUpdate}
              isDragging={!!activeTask}
              onEdit={handleEdit}
              membersById={membersById}
              currentUserId={currentUserId}
              assignedToMe={assignedToMe}
            />
          ))}
        </div>

        {/* Card "fantasma" flutuando durante o drag */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              canUpdate={false}
              isDragOverlay
              membersById={membersById}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de edição (compartilhado por todos os cards) */}
      <TaskFormModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        orgSlug={orgSlug}
        projectId={projectId}
        task={editingTask}
      />
    </>
  );
}
