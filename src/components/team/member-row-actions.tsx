"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

interface MemberRowActionsProps {
  orgSlug: string;
  memberId: string;
  currentRole: Role;
  isSelf: boolean;
  actorRole: Role;
  canUpdateRole: boolean;
  canRemove: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Membro",
  VIEWER: "Visualizador",
};

const ALL_ROLES: Role[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export function MemberRowActions({
  orgSlug,
  memberId,
  currentRole,
  isSelf,
  actorRole,
  canUpdateRole,
  canRemove,
}: MemberRowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canUpdateRole && !canRemove) return null;

  // ADMIN não pode promover para OWNER
  const availableRoles = ALL_ROLES.filter(
    (r) => !(actorRole === "ADMIN" && r === "OWNER")
  );

  async function handleRoleChange(newRole: Role) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/org/${orgSlug}/members/${memberId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = (await res.json()) as { error?: string };
    setError(body.error ?? "Erro ao alterar role.");
  }

  async function handleRemove() {
    if (!confirm("Remover este membro da organização?")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/org/${orgSlug}/members/${memberId}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = (await res.json()) as { error?: string };
    setError(body.error ?? "Erro ao remover membro.");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={loading}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Ações do membro</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdateRole && (
            <>
              <DropdownMenuLabel>Alterar role</DropdownMenuLabel>
              {availableRoles
                .filter((r) => r !== currentRole)
                .map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onSelect={() => handleRoleChange(r)}
                  >
                    {ROLE_LABELS[r]}
                  </DropdownMenuItem>
                ))}
            </>
          )}
          {canUpdateRole && canRemove && <DropdownMenuSeparator />}
          {canRemove && !isSelf && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={handleRemove}
            >
              Remover membro
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
