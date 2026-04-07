"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Plan } from "@/generated/prisma/enums";

interface Props {
  orgId: string;
  orgSlug: string;
  currentPlan: Plan;
}

interface ActionState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

const INITIAL: ActionState = { loading: false, error: null, success: null };

const PLANS: Plan[] = ["FREE", "PRO", "BUSINESS"];

/**
 * Componente de ações admin para uma organização.
 * Exige que o admin digite o slug da org para confirmar.
 */
export function AdminOrgActions({ orgId, orgSlug, currentPlan }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan>(currentPlan);
  const [state, setState] = useState<ActionState>(INITIAL);

  async function handleForcePlan() {
    if (confirm.toLowerCase() !== orgSlug.toLowerCase()) {
      setState({ loading: false, error: `Digite "${orgSlug}" para confirmar.`, success: null });
      return;
    }
    setState({ loading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/force-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, confirm }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setState({ loading: false, error: json.error ?? "Erro desconhecido", success: null });
        return;
      }
      setState({ loading: false, error: null, success: `Plano alterado para ${selectedPlan} com sucesso.` });
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
        Atenção: force-plan altera o plano localmente sem alterar o Stripe.
        Documente a razão no audit log interno.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Novo plano
          </label>
          <div className="flex gap-2">
            {PLANS.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlan(p)}
                className={`rounded border px-3 py-1 text-sm transition-colors ${
                  selectedPlan === p
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Confirmar: digite o slug <span className="font-mono font-medium">{orgSlug}</span>
          </label>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={orgSlug}
            className="max-w-sm font-mono text-sm"
            autoComplete="off"
          />
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.success && (
          <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>
        )}

        <Button
          variant="destructive"
          size="sm"
          disabled={state.loading || selectedPlan === currentPlan}
          onClick={handleForcePlan}
        >
          Forçar plano → {selectedPlan}
        </Button>
      </div>
    </div>
  );
}
