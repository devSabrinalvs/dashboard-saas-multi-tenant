"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  QrCode,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { setupConfirmSchema, type SetupConfirmInput } from "@/schemas/two-factor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WizardStep = "loading" | "qr" | "confirm" | "recovery" | "error";

interface SetupInitResult {
  qrDataUrl: string;
  secretBase32: string;
}

interface TwoFactorSetupWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorSetupWizard({ onSuccess, onCancel }: TwoFactorSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>("loading");
  const [setupData, setSetupData] = useState<SetupInitResult | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupConfirmInput>({
    resolver: zodResolver(setupConfirmSchema),
  });

  // Fetch QR code on mount
  useEffect(() => {
    async function initSetup() {
      const res = await fetch("/api/auth/2fa/setup-init", { method: "POST" });
      if (!res.ok) {
        setStep("error");
        return;
      }
      const data = await res.json() as SetupInitResult;
      setSetupData(data);
      setStep("qr");
    }
    void initSetup();
  }, []);

  async function onConfirm(data: SetupConfirmInput) {
    setServerError(null);
    const res = await fetch("/api/auth/2fa/setup-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setServerError(body.error ?? "Código inválido. Tente novamente.");
      return;
    }

    const result = await res.json() as { recoveryCodes: string[] };
    setRecoveryCodes(result.recoveryCodes);
    setStep("recovery");
  }

  function copySecret() {
    if (!setupData) return;
    void navigator.clipboard.writeText(setupData.secretBase32).then(() => {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    });
  }

  function copyCodes() {
    void navigator.clipboard.writeText(recoveryCodes.join("\n")).then(() => {
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2000);
    });
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Gerando QR code…</span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>Erro ao iniciar setup. Tente novamente.</span>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Voltar
        </Button>
      </div>
    );
  }

  // ── QR Code ───────────────────────────────────────────────────────────────
  if (step === "qr" && setupData) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="font-semibold text-sm">Configurar autenticador</h2>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Escaneie o QR code com seu aplicativo autenticador (Google Authenticator,
            Authy, 1Password, etc.).
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setupData.qrDataUrl}
            alt="QR code para configurar autenticador TOTP"
            className="rounded-lg border border-border"
            width={200}
            height={200}
          />
        </div>

        {/* Manual entry */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Ou insira o código manualmente:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-1.5 text-xs font-mono break-all">
              {setupData.secretBase32}
            </code>
            <button
              type="button"
              onClick={copySecret}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Copiar código"
            >
              {secretCopied ? (
                <Check className="size-4 text-foreground" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          onClick={() => setStep("confirm")}
        >
          Já escaniei — continuar
        </Button>
      </div>
    );
  }

  // ── Confirm TOTP ──────────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep("qr")}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="font-semibold text-sm">Confirmar código</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Insira o código de 6 dígitos gerado pelo seu autenticador para confirmar a configuração.
        </p>

        <form onSubmit={handleSubmit(onConfirm)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="setup-code">Código do autenticador</Label>
            <Input
              id="setup-code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              aria-invalid={!!errors.code}
              data-testid="setup-totp-code"
              {...register("code")}
            />
            {errors.code && (
              <p className="text-xs text-destructive" role="alert">
                {errors.code.message}
              </p>
            )}
          </div>

          {serverError && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            disabled={isSubmitting}
            data-testid="setup-confirm-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verificando…
              </>
            ) : (
              "Ativar 2FA"
            )}
          </Button>
        </form>
      </div>
    );
  }

  // ── Recovery Codes ────────────────────────────────────────────────────────
  if (step === "recovery") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-foreground" aria-hidden />
          <h2 className="font-semibold text-sm">2FA ativado com sucesso!</h2>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Guarde estes códigos de recuperação em local seguro. Cada código pode ser
            usado <strong className="text-foreground">uma única vez</strong> caso perca
            acesso ao seu autenticador.
          </p>

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((code) => (
                <code key={code} className="text-sm font-mono text-center">
                  {code}
                </code>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={copyCodes}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {codesCopied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {codesCopied ? "Copiado!" : "Copiar todos os códigos"}
          </button>
        </div>

        <Button
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          onClick={onSuccess}
          data-testid="setup-done-btn"
        >
          Concluir
        </Button>
      </div>
    );
  }

  return null;
}
