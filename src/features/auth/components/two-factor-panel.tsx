"use client";

import { useState } from "react";
import { Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TwoFactorSetupWizard } from "./two-factor-setup-wizard";
import { TwoFactorDisableForm } from "./two-factor-disable-form";

interface TwoFactorPanelProps {
  isEnabled: boolean;
}

type PanelState = "idle" | "setup" | "disable";

export function TwoFactorPanel({ isEnabled }: TwoFactorPanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [enabled, setEnabled] = useState(isEnabled);

  if (state === "setup") {
    return (
      <TwoFactorSetupWizard
        onSuccess={() => {
          setEnabled(true);
          setState("idle");
        }}
        onCancel={() => setState("idle")}
      />
    );
  }

  if (state === "disable") {
    return (
      <TwoFactorDisableForm
        onSuccess={() => {
          setEnabled(false);
          setState("idle");
        }}
        onCancel={() => setState("idle")}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {enabled ? (
            <ShieldCheck className="size-5 mt-0.5 text-foreground shrink-0" aria-hidden />
          ) : (
            <Shield className="size-5 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
          )}
          <div className="space-y-0.5">
            <p className="font-medium text-sm">Autenticação de dois fatores (2FA)</p>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Ativado — sua conta está protegida com TOTP."
                : "Desativado — adicione uma camada extra de segurança ao seu login."}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            enabled
              ? "bg-foreground/10 text-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {enabled ? "Ativo" : "Inativo"}
        </span>
      </div>

      {enabled ? (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5"
          onClick={() => setState("disable")}
        >
          <ShieldOff className="size-3.5" aria-hidden />
          Desativar 2FA
        </Button>
      ) : (
        <Button
          size="sm"
          className="bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1.5"
          onClick={() => setState("setup")}
        >
          <ShieldCheck className="size-3.5" aria-hidden />
          Ativar 2FA
        </Button>
      )}
    </div>
  );
}
