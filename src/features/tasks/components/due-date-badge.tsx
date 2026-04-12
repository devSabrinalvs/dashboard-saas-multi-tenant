"use client";

import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDueDateState(dueDate: Date | string): "overdue" | "today" | "upcoming" {
  const due = new Date(dueDate);
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (due < todayStart) return "overdue";
  if (due <= todayEnd) return "today";
  return "upcoming";
}

function formatDueDate(dueDate: Date | string): string {
  const due = new Date(dueDate);
  return due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DueDateBadgeProps {
  dueDate: Date | string;
  /** Se true, tarefa está concluída — não mostra como atrasada */
  done?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DueDateBadge({ dueDate, done = false, className }: DueDateBadgeProps) {
  const state = done ? "upcoming" : getDueDateState(dueDate);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        state === "overdue" &&
          "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        state === "today" &&
          "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        state === "upcoming" &&
          "bg-muted text-muted-foreground",
        className
      )}
      title={
        state === "overdue"
          ? "Atrasada"
          : state === "today"
            ? "Vence hoje"
            : "Prazo"
      }
    >
      <CalendarClock className="size-3" />
      {formatDueDate(dueDate)}
    </span>
  );
}
