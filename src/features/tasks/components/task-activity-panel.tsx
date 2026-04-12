"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, History } from "lucide-react";
import { apiClient } from "@/shared/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}

// ─── Action labels ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  CANCELED: "Cancelada",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

function formatAction(entry: ActivityEntry): string {
  const m = entry.metadata;
  switch (entry.action) {
    case "task.created":
      return "criou a tarefa";
    case "status.changed":
      return `alterou status de "${STATUS_LABEL[m.from as string] ?? m.from}" para "${STATUS_LABEL[m.to as string] ?? m.to}"`;
    case "priority.changed":
      return `alterou prioridade de "${PRIORITY_LABEL[m.from as string] ?? m.from}" para "${PRIORITY_LABEL[m.to as string] ?? m.to}"`;
    case "title.changed":
      return `renomeou para "${m.to as string}"`;
    case "assignee.changed":
      if (!m.to) return "removeu o responsável";
      if (!m.from) return "definiu o responsável";
      return "alterou o responsável";
    case "dueDate.changed":
      if (!m.to) return "removeu o prazo";
      return `definiu prazo para ${new Date(m.to as string).toLocaleDateString("pt-BR")}`;
    default:
      return entry.action;
  }
}

function getActorName(entry: ActivityEntry): string {
  if (entry.userName) return entry.userName;
  if (entry.userEmail) return entry.userEmail.split("@")[0]!;
  return "Alguém";
}

function getInitials(entry: ActivityEntry): string {
  const name = entry.userName ?? entry.userEmail ?? "?";
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskActivityPanelProps {
  orgSlug: string;
  taskId: string;
}

export function TaskActivityPanel({ orgSlug, taskId }: TaskActivityPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["task-activity", orgSlug, taskId],
    queryFn: () =>
      apiClient.get<{ activities: ActivityEntry[] }>(
        `/api/org/${orgSlug}/tasks/${taskId}/activity`
      ),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activities = data?.activities ?? [];

  if (activities.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <History className="size-4" />
        Sem atividade registrada.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2.5 text-sm">
          {/* Avatar */}
          <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5">
            {getInitials(entry)}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <span className="font-medium">{getActorName(entry)}</span>{" "}
            <span className="text-muted-foreground">{formatAction(entry)}</span>
          </div>

          {/* Time */}
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
            {formatDistanceToNow(new Date(entry.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
