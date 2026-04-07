import Link from "next/link";
import type { Task } from "@/server/repo/task-repo";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";

type ValidStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";

function isValidStatus(s: string): s is ValidStatus {
  return ["TODO", "IN_PROGRESS", "DONE", "CANCELED"].includes(s);
}

function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}m atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d atrás`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

interface TaskListItemProps {
  task: Task;
  orgSlug: string;
}

export function TaskListItem({ task, orgSlug }: TaskListItemProps) {
  return (
    <Link
      href={`/org/${orgSlug}/projects/${task.projectId}`}
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 -mx-3"
    >
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{task.title}</p>
        {task.tags.length > 0 && (
          <div className="mt-0.5 flex gap-1">
            {task.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-1.5 py-px text-xs text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isValidStatus(task.status) ? (
          <StatusBadge status={task.status} />
        ) : (
          <Badge variant="outline">{task.status}</Badge>
        )}
        <span className="hidden text-xs text-muted-foreground sm:block">
          {formatRelative(task.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
