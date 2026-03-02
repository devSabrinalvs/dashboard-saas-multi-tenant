"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AcceptInviteButtonProps {
  token: string;
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST",
    });

    setLoading(false);

    if (res.ok) {
      const data = (await res.json()) as { orgSlug: string };
      router.push(`/org/${data.orgSlug}/dashboard`);
      return;
    }

    if (res.status === 401) {
      router.push(`/login?callbackUrl=/invite/${token}`);
      return;
    }

    const body = (await res.json()) as { error?: string };
    setError(body.error ?? "Erro ao aceitar convite.");
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleAccept} disabled={loading} className="w-full">
        {loading ? "Aceitando…" : "Aceitar convite"}
      </Button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
