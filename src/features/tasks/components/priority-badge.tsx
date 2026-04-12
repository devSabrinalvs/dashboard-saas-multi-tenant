"use client";

import { cn } from "@/lib/utils";
import type { Priority } from "@/generated/prisma/enums";

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; className: string; dot: string }
> = {
  LOW: {
    label: "Baixa",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  MEDIUM: {
    label: "Média",
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  HIGH: {
    label: "Alta",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  URGENT: {
    label: "Urgente",
    className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PriorityBadgeProps {
  priority: Priority;
  /** Modo compacto: apenas o ponto colorido, sem texto */
  compact?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PriorityBadge({
  priority,
  compact = false,
  className,
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  if (compact) {
    return (
      <span
        className={cn("inline-block size-2 rounded-full", config.dot, className)}
        title={config.label}
        aria-label={`Prioridade: ${config.label}`}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
      aria-label={`Prioridade: ${config.label}`}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

// ─── Select options ───────────────────────────────────────────────────────────

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
];
