"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, CreditCard, ArrowUpCircle } from "lucide-react";
import type { Plan } from "@/generated/prisma/enums";
import { ApiError } from "@/shared/api/client";

interface BillingActionsProps {
  orgSlug: string;
  currentPlan: Plan;
  hasStripeCustomer: boolean;
}

/**
 * Componente client que gerencia as ações de billing:
 *  - "Upgrade" → chama /billing/checkout → redirect para Stripe Checkout
 *  - "Gerenciar assinatura" → chama /billing/portal → redirect para Customer Portal
 */
export function BillingActions({
  orgSlug,
  currentPlan,
  hasStripeCustomer,
}: BillingActionsProps) {
  const [loadingCheckout, setLoadingCheckout] = useState<Plan | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/org/${orgSlug}/billing`;

  async function startCheckout(targetPlan: "PRO" | "BUSINESS") {
    setError(null);
    setLoadingCheckout(targetPlan);
    try {
      const res = await fetch(`${base}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string; code?: string };
        throw new ApiError(body.error ?? `HTTP ${res.status}`, body.code);
      }

      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Erro ao iniciar checkout. Tente novamente.";
      setError(message);
    } finally {
      setLoadingCheckout(null);
    }
  }

  async function openPortal() {
    setError(null);
    setLoadingPortal(true);
    try {
      const res = await fetch(`${base}/portal`, { method: "POST" });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao abrir portal. Tente novamente."
      );
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Upgrade buttons */}
        {currentPlan === "FREE" && (
          <>
            <Button
              onClick={() => void startCheckout("PRO")}
              disabled={loadingCheckout !== null || loadingPortal}
            >
              {loadingCheckout === "PRO" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="mr-2 size-4" />
              )}
              Upgrade para Pro
            </Button>
            <Button
              variant="outline"
              onClick={() => void startCheckout("BUSINESS")}
              disabled={loadingCheckout !== null || loadingPortal}
            >
              {loadingCheckout === "BUSINESS" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="mr-2 size-4" />
              )}
              Upgrade para Business
            </Button>
          </>
        )}

        {currentPlan === "PRO" && (
          <Button
            variant="outline"
            onClick={() => void startCheckout("BUSINESS")}
            disabled={loadingCheckout !== null || loadingPortal}
          >
            {loadingCheckout === "BUSINESS" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="mr-2 size-4" />
            )}
            Upgrade para Business
          </Button>
        )}

        {/* Portal button (disponível quando tem customer no Stripe) */}
        {hasStripeCustomer && (
          <Button
            variant="ghost"
            onClick={() => void openPortal()}
            disabled={loadingCheckout !== null || loadingPortal}
          >
            {loadingPortal ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 size-4" />
            )}
            Gerenciar assinatura
          </Button>
        )}
      </div>

      {!hasStripeCustomer && currentPlan !== "FREE" && (
        <p className="text-xs text-muted-foreground">
          <CreditCard className="mr-1 inline size-3" />
          Sincronizando com Stripe...
        </p>
      )}
    </div>
  );
}
