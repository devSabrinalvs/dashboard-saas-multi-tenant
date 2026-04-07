"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Schema local (validação client-side básica)
// ---------------------------------------------------------------------------

const totpFormSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
});

type TotpFormData = z.infer<typeof totpFormSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TwoFactorVerifyForm() {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TotpFormData>({
    resolver: zodResolver(totpFormSchema),
  });

  async function onSubmit(data: TotpFormData) {
    setServerError(null);

    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: data.code.trim(),
        isRecoveryCode: isRecoveryMode,
        rememberDevice,
      }),
    });

    if (res.status === 429) {
      setServerError("Muitas tentativas. Aguarde 1 minuto e tente novamente.");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setServerError(body.error ?? "Código inválido. Tente novamente.");
      return;
    }

    const { nonce } = await res.json() as { nonce: string };

    // Upgrade the JWT: triggers jwt callback which consumes TwoFactorVerification
    await updateSession({ nonce });

    router.push("/org/select");
    router.refresh();
  }

  function toggleRecoveryMode() {
    setIsRecoveryMode((v) => !v);
    setServerError(null);
    reset();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight">Verificação em duas etapas</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {isRecoveryMode
            ? "Insira um dos seus códigos de recuperação."
            : "Insira o código de 6 dígitos do seu aplicativo autenticador."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="2fa-code">
            {isRecoveryMode ? "Código de recuperação" : "Código TOTP"}
          </Label>
          <Input
            id="2fa-code"
            type="text"
            inputMode={isRecoveryMode ? "text" : "numeric"}
            placeholder={isRecoveryMode ? "XXXX-XXXX" : "000000"}
            autoComplete={isRecoveryMode ? "off" : "one-time-code"}
            autoFocus
            maxLength={isRecoveryMode ? 9 : 6}
            aria-invalid={!!errors.code}
            data-testid="2fa-code"
            {...register("code")}
          />
          {errors.code && (
            <p className="text-xs text-destructive" role="alert">
              {errors.code.message}
            </p>
          )}
        </div>

        {!isRecoveryMode && (
          <div className="flex items-center gap-2">
            <input
              id="remember-device"
              type="checkbox"
              className="size-4 rounded border-border accent-foreground"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <Label htmlFor="remember-device" className="text-sm font-normal cursor-pointer">
              Lembrar deste dispositivo por 30 dias
            </Label>
          </div>
        )}

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
          data-testid="2fa-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verificando…
            </>
          ) : (
            "Verificar"
          )}
        </Button>
      </form>

      {/* Toggle recovery mode */}
      <button
        type="button"
        onClick={toggleRecoveryMode}
        className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <KeyRound className="size-3.5" aria-hidden />
        {isRecoveryMode ? "Usar código do autenticador" : "Usar código de recuperação"}
      </button>
    </div>
  );
}
