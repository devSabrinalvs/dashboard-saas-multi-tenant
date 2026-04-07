"use client";

import { AlertTriangle, XCircle, Info, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BillingBannerType } from "@/billing/billing-state";

interface BillingBannerProps {
  bannerType: BillingBannerType;
  orgSlug: string;
  /** Unix timestamp (ms) do graceUntil — passado como number para evitar serialização de Date */
  graceUntilMs: number | null;
  /** Unix timestamp (ms) do currentPeriodEnd */
  currentPeriodEndMs: number | null;
  /** Se true, mostra o banner completo com CTA. Se false, mostra versão compacta "Contact admin". */
  canManageBilling: boolean;
}

const BANNER_STYLES: Record<
  Exclude<BillingBannerType, null>,
  { bg: string; border: string; text: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  payment_issue_grace: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    Icon: AlertTriangle,
  },
  payment_issue_expired: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
    Icon: XCircle,
  },
  cancel_pending: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    Icon: Info,
  },
  incomplete: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    Icon: AlertTriangle,
  },
};

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(ms));
}

export function BillingBanner({
  bannerType,
  orgSlug,
  graceUntilMs,
  currentPeriodEndMs,
  canManageBilling,
}: BillingBannerProps) {
  if (!bannerType) return null;

  const style = BANNER_STYLES[bannerType];
  const billingHref = `/org/${orgSlug}/settings/billing`;

  if (!canManageBilling) {
    // Membros não-OWNER veem apenas um aviso genérico para contatar o admin
    if (bannerType === "payment_issue_expired") {
      return (
        <div className={cn("rounded-md border px-4 py-2.5 text-sm flex items-center gap-2 mb-4", style.bg, style.border, style.text)}>
          <XCircle className="size-4 shrink-0" />
          Há um problema com a assinatura desta organização. Contate o administrador.
        </div>
      );
    }
    return null; // Outros banners só para OWNER
  }

  let message: React.ReactNode;
  let ctaLabel: string;

  switch (bannerType) {
    case "payment_issue_grace":
      message = (
        <>
          <strong>Problema de pagamento.</strong>{" "}
          Atualize seu método de pagamento para manter o acesso ao plano.
          {graceUntilMs && (
            <span className="ml-1">
              Prazo: <strong>{formatDate(graceUntilMs)}</strong>.
            </span>
          )}
        </>
      );
      ctaLabel = "Gerenciar pagamento";
      break;

    case "payment_issue_expired":
      message = (
        <>
          <strong>Acesso premium expirado.</strong>{" "}
          O grace period encerrou. Faça upgrade para restaurar os limites do plano pago.
        </>
      );
      ctaLabel = "Fazer upgrade";
      break;

    case "cancel_pending":
      message = (
        <>
          <strong>Assinatura cancelando.</strong>{" "}
          Seu plano encerrará em{" "}
          <strong>{currentPeriodEndMs ? formatDate(currentPeriodEndMs) : "breve"}</strong>.
          Após essa data, o plano volta para Free.
        </>
      );
      ctaLabel = "Reativar assinatura";
      break;

    case "incomplete":
      message = (
        <>
          <strong>Pagamento incompleto.</strong>{" "}
          Finalize o pagamento para ativar sua assinatura.
        </>
      );
      ctaLabel = "Completar pagamento";
      break;
  }

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-2.5 text-sm flex items-center justify-between gap-4 mb-4",
        style.bg,
        style.border,
        style.text
      )}
    >
      <div className="flex items-center gap-2">
        <style.Icon className="size-4 shrink-0" />
        <span>{message}</span>
      </div>
      <Link
        href={billingHref}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold shrink-0 underline-offset-2 hover:underline",
          style.text
        )}
      >
        {ctaLabel}
        <ExternalLink className="size-3" />
      </Link>
    </div>
  );
}
