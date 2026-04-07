"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  userId: string;
  userEmail: string;
  isLocked: boolean;
  hasActive2FA: boolean;
  emailVerified: boolean;
}

interface ActionState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

const INITIAL: ActionState = { loading: false, error: null, success: null };

/**
 * Componente de ações admin para um usuário.
 * Exige que o admin digite o email do usuário para confirmar ações sensíveis.
 */
export function AdminUserActions({
  userId,
  userEmail,
  isLocked,
  hasActive2FA,
  emailVerified,
}: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<ActionState>(INITIAL);

  async function performAction(endpoint: string, label: string) {
    if (confirm.toLowerCase() !== userEmail.toLowerCase()) {
      setState({ loading: false, error: `Digite "${userEmail}" para confirmar.`, success: null });
      return;
    }
    setState({ loading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; revokedCount?: number };
      if (!res.ok) {
        setState({ loading: false, error: json.error ?? "Erro desconhecido", success: null });
        return;
      }
      const msg =
        endpoint === "revoke-sessions"
          ? `${label}: ${json.revokedCount ?? 0} sessão(ões) revogada(s).`
          : `${label} realizado com sucesso.`;
      setState({ loading: false, error: null, success: msg });
      setConfirm("");
      router.refresh();
    } catch {
      setState({ loading: false, error: "Erro de rede", success: null });
    }
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="font-semibold text-sm">Ações administrativas</h3>
      <p className="text-sm text-muted-foreground">
        Para executar qualquer ação, digite o email do usuário:{" "}
        <span className="font-mono font-medium">{userEmail}</span>
      </p>

      <Input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Digite o email do usuário para confirmar"
        className="max-w-sm font-mono text-sm"
        autoComplete="off"
      />

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {isLocked && (
          <Button
            variant="outline"
            size="sm"
            disabled={state.loading}
            onClick={() => performAction("unlock", "Desbloquear conta")}
          >
            Desbloquear conta
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={state.loading}
          onClick={() => performAction("revoke-sessions", "Revogar sessões")}
        >
          Revogar todas as sessões
        </Button>

        {!emailVerified && (
          <Button
            variant="outline"
            size="sm"
            disabled={state.loading}
            onClick={() => performAction("verify-email", "Forçar verificação de email")}
          >
            Forçar verificação de email
          </Button>
        )}

        {hasActive2FA && (
          <Button
            variant="destructive"
            size="sm"
            disabled={state.loading}
            onClick={() => performAction("disable-2fa", "Desativar 2FA")}
          >
            Desativar 2FA
          </Button>
        )}
      </div>
    </div>
  );
}
