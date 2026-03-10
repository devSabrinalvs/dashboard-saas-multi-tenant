"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "./turnstile-widget";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
      ...(turnstileToken ? { turnstileToken } : {}),
    });

    if (result?.error) {
      setServerError("Email ou senha incorretos.");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/org/select";
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl: "/org/select" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta para continuar.
        </p>
      </div>

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
          <Input
            id="login-password"
            type="password"
            placeholder="••••••"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            data-testid="login-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

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
          className="w-full"
          disabled={isSubmitting}
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
          className="font-medium text-primary hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
