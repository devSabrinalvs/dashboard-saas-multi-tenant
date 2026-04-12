"use client";

import { useEffect, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskCreateSchema, type TaskCreateInput } from "@/schemas/task";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import { useUpdateTask } from "@/features/tasks/hooks/use-update-task";
import { useOrgMembers } from "@/features/tasks/hooks/use-org-members";
import { AssigneeSelector } from "./assignee-selector";
import { PriorityBadge, PRIORITY_OPTIONS } from "./priority-badge";
import { SubTasksPanel } from "./sub-tasks-panel";
import { TaskCommentsPanel } from "./task-comments-panel";
import type { Task } from "@/server/repo/task-repo";

/** Converte Date | string | null | undefined → "YYYY-MM-DD" para input[type=date] */
function toDateInputValue(date?: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

const STATUS_LABELS: Record<string, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
  CANCELED: "Cancelado",
};

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  projectId: string;
  /** Se fornecido, modo edição. */
  task?: Task;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canAdminDelete?: boolean;
  currentUserId?: string;
}

export function TaskFormModal({
  open,
  onOpenChange,
  orgSlug,
  projectId,
  task,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  canAdminDelete = false,
  currentUserId = "",
}: TaskFormModalProps) {
  const isEditing = !!task;
  const createMutation = useCreateTask(orgSlug, projectId);
  const updateMutation = useUpdateTask(orgSlug, projectId);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { data: members } = useOrgMembers(orgSlug);

  const [tagsInput, setTagsInput] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskCreateInput>({
    resolver: zodResolver(taskCreateSchema) as Resolver<TaskCreateInput>,
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "TODO",
      priority: task?.priority ?? "MEDIUM",
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : null,
      tags: task?.tags ?? [],
      assigneeUserId: task?.assigneeUserId ?? null,
    },
  });

  const currentStatus = watch("status");
  const currentPriority = watch("priority");
  const currentTags = watch("tags");
  const currentAssignee = watch("assigneeUserId");

  useEffect(() => {
    if (open) {
      reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? "TODO",
        priority: task?.priority ?? "MEDIUM",
        dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : null,
        tags: task?.tags ?? [],
        assigneeUserId: task?.assigneeUserId ?? null,
      });
      setTagsInput(task?.tags?.join(", ") ?? "");
    }
  }, [open, task, reset]);

  function handleTagsChange(value: string) {
    setTagsInput(value);
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setValue("tags", tags);
  }

  async function onSubmit(data: TaskCreateInput) {
    if (isEditing && task) {
      updateMutation.mutate(
        { taskId: task.id, data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          reset();
          setTagsInput("");
          onOpenChange(false);
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar tarefa" : "Nova tarefa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              placeholder="Título da tarefa"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-status">Status</Label>
            <Select
              value={currentStatus}
              onValueChange={(v) =>
                setValue("status", v as TaskCreateInput["status"])
              }
            >
              <SelectTrigger id="task-status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-priority">Prioridade</Label>
            <Select
              value={currentPriority}
              onValueChange={(v) =>
                setValue("priority", v as TaskCreateInput["priority"])
              }
            >
              <SelectTrigger id="task-priority">
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    <PriorityBadge priority={value} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-due-date">Prazo</Label>
            <Input
              id="task-due-date"
              type="date"
              value={toDateInputValue(watch("dueDate"))}
              onChange={(e) => {
                const val = e.target.value;
                setValue(
                  "dueDate",
                  val ? new Date(val + "T12:00:00.000Z").toISOString() : null
                );
              }}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-assignee">Responsável</Label>
            <AssigneeSelector
              members={members ?? []}
              value={currentAssignee}
              onChange={(userId) => setValue("assigneeUserId", userId)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              placeholder="Descrição da tarefa (opcional)"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-tags">
              Tags{" "}
              <span className="text-xs text-muted-foreground">
                (separadas por vírgula)
              </span>
            </Label>
            <Input
              id="task-tags"
              placeholder="backend, api, bug"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
            />
            {errors.tags && (
              <p className="text-xs text-destructive">{errors.tags.message}</p>
            )}
            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {currentTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sub-tarefas — apenas no modo edição */}
          {isEditing && task && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Sub-tarefas</p>
              <SubTasksPanel
                orgSlug={orgSlug}
                taskId={task.id}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
              />
            </div>
          )}

          {/* Comentários — apenas no modo edição */}
          {isEditing && task && currentUserId && (
            <div className="border-t pt-4">
              <TaskCommentsPanel
                orgSlug={orgSlug}
                taskId={task.id}
                currentUserId={currentUserId}
                canAdminDelete={canAdminDelete}
              />
            </div>
          )}

          {(createMutation.error ?? updateMutation.error) && (
            <p className="text-sm text-destructive">
              {(createMutation.error ?? updateMutation.error)?.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
