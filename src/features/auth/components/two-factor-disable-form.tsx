"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldOff, Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { disableTwoFactorSchema, type DisableTwoFactorInput } from "@/schemas/two-factor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TwoFactorDisableFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorDisableForm({ onSuccess, onCancel }: TwoFactorDisableFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DisableTwoFactorInput>({
    resolver: zodResolver(disableTwoFactorSchema),
  });

  async function onSubmit(data: DisableTwoFactorInput) {
    setServerError(null);

    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setServerError(body.error ?? "Erro ao desativar. Tente novamente.");
      return;
    }

    onSuccess();
  }

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
        <div className="flex items-center gap-1.5">
          <ShieldOff className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="font-semibold text-sm">Desativar 2FA</h2>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Para confirmar, insira o código atual do seu autenticador. Ao desativar, todos
        os dispositivos de confiança serão revogados.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="disable-code">Código do autenticador</Label>
          <Input
            id="disable-code"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            aria-invalid={!!errors.totpCode}
            data-testid="disable-totp-code"
            {...register("totpCode")}
          />
          {errors.totpCode && (
            <p className="text-xs text-destructive" role="alert">
              {errors.totpCode.message}
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

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="flex-1"
            disabled={isSubmitting}
            data-testid="disable-confirm-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Desativando…
              </>
            ) : (
              "Desativar"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
