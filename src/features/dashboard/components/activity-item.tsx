import type { AuditLogItem } from "@/server/repo/audit-repo";

/** Mapeamento de action strings para labels em português */
const ACTION_LABELS: Record<string, string> = {
  "project.created": "Criou um projeto",
  "project.updated": "Atualizou um projeto",
  "project.deleted": "Excluiu um projeto",
  "task.created": "Criou uma tarefa",
  "task.updated": "Atualizou uma tarefa",
  "task.deleted": "Excluiu uma tarefa",
  "member.invited": "Convidou um membro",
  "member.removed": "Removeu um membro",
  "member.role_updated": "Alterou papel de membro",
  "invite.revoked": "Revogou convite",
  "invite.accepted": "Aceitou convite",
  "org.created": "Criou a organização",
};

function formatLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, " ");
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

interface ActivityItemProps {
  log: AuditLogItem;
}

export function ActivityItem({ log }: ActivityItemProps) {
  const actor = log.actor?.email ?? "Usuário removido";
  const actorShort = actor.split("@")[0] ?? actor;

  return (
    <div className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{formatLabel(log.action)}</p>
        <p className="truncate text-xs text-muted-foreground">
          por{" "}
          <span className="font-medium text-foreground/80">{actorShort}</span>
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
        {formatRelative(log.createdAt)}
      </span>
    </div>
  );
}
