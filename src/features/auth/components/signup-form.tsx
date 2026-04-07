"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, X, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "./turnstile-widget";
import { cn } from "@/lib/utils";

// Client-side schema (mirrors server signupSchema without turnstileToken)
const signupSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .refine((v) => /\d/.test(v), "Deve conter pelo menos 1 número")
      .refine(
        (v) => /[^a-zA-Z0-9]/.test(v),
        "Deve conter pelo menos 1 símbolo"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

interface PasswordRequirement {
  label: string;
  met: (value: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "Mínimo 8 caracteres", met: (v) => v.length >= 8 },
  { label: "Pelo menos 1 número", met: (v) => /\d/.test(v) },
  { label: "Pelo menos 1 símbolo", met: (v) => /[^a-zA-Z0-9]/.test(v) },
];

function PasswordStrengthIndicator({ value }: { value: string }) {
  if (!value) return null;
  return (
    <ul className="mt-2 space-y-1" aria-label="Requisitos de senha">
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = req.met(value);
        return (
          <li key={req.label} className="flex items-center gap-1.5">
            {met ? (
              <Check
                className="size-3.5 text-foreground shrink-0"
                aria-hidden
              />
            ) : (
              <X className="size-3.5 text-muted-foreground/50 shrink-0" aria-hidden />
            )}
            <span
              className={cn(
                "text-xs",
                met ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {req.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const passwordValue = watch("password") ?? "";

  async function onSubmit(data: SignupFormData) {
    setServerError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name || undefined,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        turnstileToken: turnstileToken ?? "",
      }),
    });

    if (res.status === 201) {
      router.push(
        `/verify-email/pending?email=${encodeURIComponent(data.email)}`
      );
      return;
    }

    // Resetar Turnstile em caso de erro (token é single-use)
    setTurnstileKey((k) => k + 1);
    setTurnstileToken(null);

    if (res.status === 409) {
      setServerError("Este email já está cadastrado.");
      return;
    }
    if (res.status === 400) {
      setServerError("Verificação anti-bot falhou. Tente novamente.");
      return;
    }
    if (res.status === 429) {
      setServerError("Muitas tentativas. Tente novamente mais tarde.");
      return;
    }

    setServerError("Erro ao criar conta. Tente novamente.");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Configure seu workspace em poucos minutos.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="signup-name">
            Nome{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="signup-name"
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            data-testid="signup-name"
            {...register("name")}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="voce@exemplo.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            data-testid="signup-email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="signup-password">Senha</Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              data-testid="signup-password"
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
          <PasswordStrengthIndicator value={passwordValue} />
          {errors.password && (
            <p className="text-xs text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="signup-confirm">Confirmar senha</Label>
          <div className="relative">
            <Input
              id="signup-confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              data-testid="signup-confirm"
              className="pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <TurnstileWidget
          key={turnstileKey}
          onToken={(t) => setTurnstileToken(t)}
          onExpire={() => setTurnstileToken(null)}
        />

        <Button
          type="submit"
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          disabled={isSubmitting}
          data-testid="signup-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Criando conta…
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
