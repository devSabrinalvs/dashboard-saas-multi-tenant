"use client";

import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import { KanbanQuickAdd } from "./kanban-quick-add";
import type { Task } from "@/server/repo/task-repo";
import type { TaskStatus } from "@/features/tasks/hooks/use-kanban-tasks";
import type { OrgMember } from "@/features/tasks/hooks/use-org-members";

// ─── Column visual config ─────────────────────────────────────────────────────

const COLUMN_BG: Record<TaskStatus, string> = {
  TODO: "bg-slate-50 dark:bg-slate-800/40",
  IN_PROGRESS: "bg-blue-50 dark:bg-blue-900/20",
  DONE: "bg-emerald-50 dark:bg-emerald-900/20",
  CANCELED: "bg-red-50/60 dark:bg-red-900/15",
};

const COLUMN_BORDER: Record<TaskStatus, string> = {
  TODO: "border-slate-200 dark:border-slate-700",
  IN_PROGRESS: "border-blue-200 dark:border-blue-800",
  DONE: "border-emerald-200 dark:border-emerald-800",
  CANCELED: "border-red-200 dark:border-red-800",
};

const COLUMN_BADGE: Record<TaskStatus, string> = {
  TODO: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
  DONE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
  CANCELED: "bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  orgSlug: string;
  projectId: string;
  canCreate: boolean;
  canUpdate: boolean;
  /** true enquanto qualquer card está sendo arrastado */
  isDragging: boolean;
  onEdit: (task: Task) => void;
  membersById: Record<string, OrgMember>;
  /** ID do usuário autenticado — usado no quick-add quando assignedToMe=true */
  currentUserId: string;
  /** Se true, quick-add auto-atribui ao currentUserId */
  assignedToMe: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Coluna do Kanban. É um droppable do dnd-kit.
 *
 * - Recebe tasks já filtradas pelo status desta coluna
 * - Exibe header com label + badge de contagem
 * - Área de cards com scroll vertical
 * - Quick-add no rodapé (se `canCreate`)
 * - Highlight com ring quando um card está sobre esta coluna
 */
export const KanbanColumn = memo(function KanbanColumn({
  status,
  label,
  tasks,
  orgSlug,
  projectId,
  canCreate,
  canUpdate,
  isDragging,
  onEdit,
  membersById,
  currentUserId,
  assignedToMe,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={cn(
        "flex w-[280px] flex-shrink-0 flex-col rounded-xl border-2 transition-colors",
        COLUMN_BG[status],
        COLUMN_BORDER[status],
        isOver && canUpdate && "ring-2 ring-primary ring-offset-2",
      )}
      data-testid={`kanban-column-${status}`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-black/5 px-3 py-2.5 dark:border-white/5">
        <span className="text-sm font-semibold tracking-tight">{label}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            COLUMN_BADGE[status],
          )}
          data-testid={`kanban-column-count-${status}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* ── Cards area (droppable) ──────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 overflow-y-auto p-3",
          "min-h-[120px] max-h-[calc(100vh-320px)]",
          isDragging && canUpdate && "bg-primary/5",
        )}
        data-testid={`kanban-dropzone-${status}`}
      >
        {tasks.length === 0 && !isDragging && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nenhuma tarefa
          </p>
        )}

        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canUpdate={canUpdate}
            onEdit={onEdit}
            membersById={membersById}
          />
        ))}
      </div>

      {/* ── Quick add ──────────────────────────────────────────────────── */}
      {canCreate && (
        <div className="border-t border-black/5 px-3 pb-3 pt-2 dark:border-white/5">
          <KanbanQuickAdd
            orgSlug={orgSlug}
            projectId={projectId}
            status={status}
            assigneeUserId={assignedToMe ? currentUserId : undefined}
          />
        </div>
      )}
    </div>
  );
});
