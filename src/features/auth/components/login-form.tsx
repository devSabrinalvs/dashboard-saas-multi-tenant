"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "./turnstile-widget";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface EmailStatusResponse {
  notVerified: boolean;
  locked: boolean;
  lockedUntilMs: number | null;
}

// Google "G" icon SVG (official brand colors)
function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

/** Converte ms em "X min" ou "X h Y min" (sem import direto do server helper em client). */
function formatMs(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

function useLockCountdown(lockedUntilMs: number | null) {
  const [remainingMs, setRemainingMs] = useState<number>(
    lockedUntilMs ? Math.max(0, lockedUntilMs - Date.now()) : 0
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!lockedUntilMs) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const ms = Math.max(0, lockedUntilMs - Date.now());
      setRemainingMs(ms);
      if (ms === 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lockedUntilMs]);

  return remainingMs;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isJustVerified = searchParams.get("verified") === "1";
  const isJustReset = searchParams.get("reset") === "1";
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [lockedUntilMs, setLockedUntilMs] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const lockRemainingMs = useLockCountdown(lockedUntilMs);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    setEmailNotVerified(false);
    setLockedUntilMs(null);

    let result: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
    } catch {
      // signIn pode lançar se o servidor retornar resposta não-JSON (ex: 429 HTML)
      setServerError("Muitas tentativas. Tente novamente mais tarde.");
      return;
    }

    // Login sem erro — redirecionar
    if (!result || result.ok) {
      const callbackUrl = searchParams.get("callbackUrl") ?? "/auth/continue";
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    // Resposta 429 do servidor (rate limit externo ou middleware)
    if (result.status === 429) {
      setServerError("Muitas tentativas. Tente novamente mais tarde.");
      return;
    }

    // Falha de credenciais — consultar email-status para mensagem específica
    try {
      const statusRes = await fetch("/api/auth/email-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (!statusRes.ok) {
        setServerError("Email ou senha incorretos.");
        return;
      }

      const status = await statusRes.json() as EmailStatusResponse;

      if (status.locked && status.lockedUntilMs) {
        setLockedUntilMs(status.lockedUntilMs);
      } else if (status.notVerified) {
        setEmailNotVerified(true);
      } else {
        setServerError("Email ou senha incorretos.");
      }
    } catch {
      setServerError("Email ou senha incorretos.");
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl: "/auth/continue" });
  }

  const isLocked = lockedUntilMs !== null && lockRemainingMs > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta para continuar.
        </p>
      </div>

      {/* Email just verified banner */}
      {isJustVerified && (
        <div className="flex items-center gap-2.5 rounded-lg border border-foreground/15 bg-foreground/5 px-4 py-3 text-sm text-foreground">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Email verificado com sucesso! Faça login abaixo.</span>
        </div>
      )}

      {/* Password just reset banner */}
      {isJustReset && (
        <div className="flex items-center gap-2.5 rounded-lg border border-foreground/15 bg-foreground/5 px-4 py-3 text-sm text-foreground">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Senha atualizada com sucesso! Faça login com sua nova senha.</span>
        </div>
      )}

      {/* Google Sign-in */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => void handleGoogleSignIn()}
        data-testid="login-google"
      >
        <GoogleIcon />
        Entrar com Google
      </Button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t" />
        <span className="text-xs text-muted-foreground shrink-0">
          ou continue com email
        </span>
        <div className="flex-1 border-t" />
      </div>

      {/* Credentials form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="voce@exemplo.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            data-testid="login-email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Senha</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              data-testid="login-password"
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Conta bloqueada */}
        {isLocked && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            <Lock className="size-4 mt-0.5 shrink-0" />
            <span>
              Muitas tentativas. Tente novamente em{" "}
              <strong>{formatMs(lockRemainingMs)}</strong>.{" "}
              <Link
                href="/forgot-password"
                className="font-semibold underline hover:no-underline"
              >
                Esqueceu a senha?
              </Link>
            </span>
          </div>
        )}

        {/* Email não verificado */}
        {emailNotVerified && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>
              Seu email ainda não foi verificado.{" "}
              <Link
                href="/verify-email/pending"
                className="font-semibold underline hover:no-underline"
              >
                Reenviar verificação
              </Link>
            </span>
          </div>
        )}

        {serverError && (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        )}

        <TurnstileWidget
          onToken={(t) => setTurnstileToken(t)}
          onExpire={() => setTurnstileToken(null)}
        />

        <Button
          type="submit"
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          disabled={isSubmitting || isLocked}
          data-testid="login-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Entrando…
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
