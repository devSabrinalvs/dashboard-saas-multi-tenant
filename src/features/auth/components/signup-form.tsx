"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, X, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "./turnstile-widget";
import { cn } from "@/lib/utils";

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
                className="size-3.5 text-emerald-500 shrink-0"
                aria-hidden
              />
            ) : (
              <X className="size-3.5 text-muted-foreground/50 shrink-0" aria-hidden />
            )}
            <span
              className={cn(
                "text-xs",
                met ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
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
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const passwordValue = watch("password") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function onSubmit(_: SignupFormData) {
    // UI-only — backend will be implemented in Etapa B
    setSubmitted(true);
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

      {/* Etapa B banner */}
      {submitted && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary"
          role="status"
        >
          <Info className="size-4 mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong>Em breve!</strong> O cadastro completo será implementado na
            Etapa B, com verificação de email e criação de organização.
          </span>
        </div>
      )}

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
          <Input
            id="signup-password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            data-testid="signup-password"
            {...register("password")}
          />
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
          <Input
            id="signup-confirm"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            data-testid="signup-confirm"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <TurnstileWidget
          onToken={(t) => setTurnstileToken(t)}
          onExpire={() => setTurnstileToken(null)}
        />

        {/* Hidden field to include turnstileToken in payload (Etapa B will use it) */}
        <input type="hidden" value={turnstileToken ?? ""} name="turnstileToken" />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || submitted}
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
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
