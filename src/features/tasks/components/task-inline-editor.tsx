"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { useUpdateTaskOptimistic } from "@/features/tasks/hooks/use-update-task-optimistic";
import type { Task } from "@/server/repo/task-repo";

type ValidStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";

const STATUS_OPTIONS: ValidStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"];
const STATUS_LABELS: Record<ValidStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
  CANCELED: "Cancelado",
};

function isValidStatus(s: string): s is ValidStatus {
  return STATUS_OPTIONS.includes(s as ValidStatus);
}

// ─── Inline Title ────────────────────────────────────────────────────────────

interface InlineTitleProps {
  task: Task;
  orgSlug: string;
  projectId: string;
  disabled?: boolean;
}

export function InlineTitle({ task, orgSlug, projectId, disabled }: InlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useUpdateTaskOptimistic(orgSlug, projectId);

  // Re-sync draft se task.title mudar externamente (optimistic update)
  useEffect(() => {
    if (!editing) setDraft(task.title);
  }, [task.title, editing]);

  function startEdit() {
    if (disabled) return;
    setDraft(task.title);
    setEditing(true);
    // Focus depois do render
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function cancel() {
    setDraft(task.title);
    setEditing(false);
  }

  function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === task.title) {
      cancel();
      return;
    }
    mutation.mutate(
      { taskId: task.id, data: { title: trimmed } },
      { onSettled: () => setEditing(false) }
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") cancel();
          }}
          onBlur={save}
          className="flex-1 rounded border border-primary/50 bg-background px-2 py-0.5 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
          autoFocus
          data-testid="inline-title-input"
        />
        {mutation.isPending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1">
      <span
        className="font-medium cursor-text hover:underline decoration-dotted underline-offset-2"
        onClick={startEdit}
        title={disabled ? undefined : "Clique para editar"}
        data-testid="inline-title-display"
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        onKeyDown={(e) => { if (!disabled && e.key === "Enter") startEdit(); }}
      >
        {task.title}
      </span>
      {mutation.isPending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
    </div>
  );
}

// ─── Inline Status ────────────────────────────────────────────────────────────

interface InlineStatusProps {
  task: Task;
  orgSlug: string;
  projectId: string;
  disabled?: boolean;
}

export function InlineStatus({ task, orgSlug, projectId, disabled }: InlineStatusProps) {
  const mutation = useUpdateTaskOptimistic(orgSlug, projectId);

  function handleChange(newStatus: string) {
    if (newStatus === task.status) return;
    mutation.mutate({ taskId: task.id, data: { status: newStatus as ValidStatus } });
  }

  if (disabled || !isValidStatus(task.status)) {
    return isValidStatus(task.status) ? (
      <StatusBadge status={task.status} />
    ) : (
      <span className="text-xs text-muted-foreground">{task.status}</span>
    );
  }

  return (
    <div className="relative flex items-center gap-1">
      <Select value={task.status} onValueChange={handleChange} disabled={mutation.isPending}>
        <SelectTrigger className="h-auto w-auto border-0 p-0 shadow-none focus:ring-0 [&>span]:flex" data-testid="inline-status-select">
          <StatusBadge status={task.status} />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mutation.isPending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
    </div>
  );
}

// ─── Inline Tags ──────────────────────────────────────────────────────────────

interface InlineTagsProps {
  task: Task;
  orgSlug: string;
  projectId: string;
  disabled?: boolean;
}

export function InlineTags({ task, orgSlug, projectId, disabled }: InlineTagsProps) {
  const [open, setOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const mutation = useUpdateTaskOptimistic(orgSlug, projectId);

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || task.tags.includes(tag) || task.tags.length >= 10) return;
    const newTags = [...task.tags, tag];
    mutation.mutate({ taskId: task.id, data: { tags: newTags } });
    setTagInput("");
  }

  function removeTag(tag: string) {
    const newTags = task.tags.filter((t) => t !== tag);
    mutation.mutate({ taskId: task.id, data: { tags: newTags } });
  }

  return (
    <Popover open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="flex flex-wrap gap-1 rounded hover:bg-muted/50 px-1 py-0.5 transition-colors disabled:cursor-default"
          title={disabled ? undefined : "Gerenciar tags"}
          data-testid="inline-tags-trigger"
        >
          {task.tags.length > 0 ? (
            task.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">+ tag</span>
          )}
          {task.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>
          )}
          {mutation.isPending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-2" align="start">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</p>
        <div className="flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
            >
              {t}
              <button
                onClick={() => removeTag(t)}
                disabled={mutation.isPending}
                className="hover:text-destructive"
                aria-label={`Remover tag ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Nova tag…"
            className="h-7 text-xs"
            maxLength={24}
            disabled={mutation.isPending || task.tags.length >= 10}
          />
          <Button size="sm" onClick={addTag} disabled={mutation.isPending || !tagInput.trim()}>
            +
          </Button>
        </div>
        {task.tags.length >= 10 && (
          <p className="text-xs text-muted-foreground">Limite de 10 tags atingido</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
