"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface InviteRowActionsProps {
  orgSlug: string;
  inviteId: string;
}

export function InviteRowActions({ orgSlug, inviteId }: InviteRowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    if (!confirm("Revogar este convite?")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/org/${orgSlug}/invites/${inviteId}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = (await res.json()) as { error?: string };
    setError(body.error ?? "Erro ao revogar convite.");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        disabled={loading}
        onClick={handleRevoke}
        title="Revogar convite"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="sr-only">Revogar convite</span>
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
