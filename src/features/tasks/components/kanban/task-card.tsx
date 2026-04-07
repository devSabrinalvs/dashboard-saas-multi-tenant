"use client";

import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/server/repo/task-repo";
import { AssigneeAvatar, NoAssigneeAvatar } from "@/features/tasks/components/assignee-avatar";
import type { OrgMember } from "@/features/tasks/hooks/use-org-members";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  canUpdate: boolean;
  isDragOverlay?: boolean;
  onEdit?: (task: Task) => void;
  /** Mapa userId → membro para exibir avatar do responsável */
  membersById?: Record<string, OrgMember>;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Card de tarefa para o Kanban.
 *
 * - É arrastável via dnd-kit quando `canUpdate=true`
 * - Mostra título + tags
 * - Exibe botão de editar no hover (abre modal no KanbanBoard)
 * - Quando `isDragOverlay=true`, renderiza a versão "fantasma" durante drag
 */
export const TaskCard = memo(function TaskCard({
  task,
  canUpdate,
  isDragOverlay = false,
  onEdit,
  membersById = {},
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task },
      disabled: !canUpdate || isDragOverlay,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(canUpdate && !isDragOverlay ? listeners : {})}
      className={cn(
        "group relative rounded-lg border bg-card p-3 shadow-sm transition-all select-none",
        canUpdate && !isDragOverlay && "cursor-grab active:cursor-grabbing",
        !canUpdate && "cursor-default",
        isDragging && "opacity-40",
        isDragOverlay && "shadow-xl rotate-1 cursor-grabbing scale-105",
        !isDragOverlay && "hover:shadow-md hover:-translate-y-0.5",
      )}
      data-testid={`task-card-${task.id}`}
    >
      {/* Edit button — visível no hover */}
      {canUpdate && onEdit && !isDragOverlay && (
        <button
          className="absolute right-2 top-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          aria-label={`Editar tarefa ${task.title}`}
          data-testid={`task-card-edit-${task.id}`}
        >
          <Pencil className="size-3 text-muted-foreground" />
        </button>
      )}

      {/* Título */}
      <p
        className={cn(
          "text-sm font-medium leading-snug text-card-foreground",
          canUpdate && onEdit && "pr-6",
        )}
      >
        {task.title}
      </p>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{task.tags.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Assignee avatar */}
      <div className="mt-2 flex items-center justify-end">
        {task.assigneeUserId ? (
          (() => {
            const member = membersById[task.assigneeUserId];
            return member ? (
              <AssigneeAvatar
                name={member.user.name}
                email={member.user.email}
                size={22}
              />
            ) : (
              <NoAssigneeAvatar size={22} />
            );
          })()
        ) : (
          <NoAssigneeAvatar size={22} />
        )}
      </div>
    </div>
  );
});
