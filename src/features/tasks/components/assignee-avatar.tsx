"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssigneeAvatarProps {
  name: string | null;
  email: string;
  /** Tamanho do avatar em px. Padrão: 24 */
  size?: number;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Gera iniciais a partir do nome ou email */
function getInitials(name: string | null, email: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/** Gera cor de fundo determinística a partir do email */
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function getAvatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Avatar do responsável de uma tarefa.
 * Exibe iniciais com cor determinística e tooltip com nome/email.
 * Se name/email não fornecidos, exibe ícone genérico.
 */
export function AssigneeAvatar({
  name,
  email,
  size = 24,
  className,
}: AssigneeAvatarProps) {
  const initials = getInitials(name, email);
  const colorClass = getAvatarColor(email);
  const displayName = name || email;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full text-white font-medium shrink-0 cursor-default select-none",
              colorClass,
              className
            )}
            style={{ width: size, height: size, fontSize: size * 0.4 }}
            data-testid="assignee-avatar"
            aria-label={`Responsável: ${displayName}`}
          >
            {initials}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs font-medium">{displayName}</p>
          {name && (
            <p className="text-xs text-muted-foreground">{email}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Placeholder para "sem responsável" */
export function NoAssigneeAvatar({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground/50 shrink-0",
        className
      )}
      style={{ width: size, height: size }}
      data-testid="no-assignee-avatar"
      aria-label="Sem responsável"
    >
      <UserRound style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}
