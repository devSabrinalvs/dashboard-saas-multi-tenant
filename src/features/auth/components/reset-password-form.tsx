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
import { cn } from "@/lib/utils";

const formSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .refine((v) => /\d/.test(v), "Deve conter pelo menos 1 número")
      .refine(
        (v) => /[^a-zA-Z0-9]/.test(v),
        "Deve conter pelo menos 1 símbolo"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

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
              <Check className="size-3.5 text-foreground shrink-0" aria-hidden />
            ) : (
              <X className="size-3.5 text-muted-foreground/50 shrink-0" aria-hidden />
            )}
            <span className={cn("text-xs", met ? "text-foreground" : "text-muted-foreground")}>
              {req.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const passwordValue = watch("newPassword") ?? "";

  async function onSubmit(data: FormData) {
    setServerError(null);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      }),
    });

    if (res.status === 200) {
      router.push("/login?reset=1");
      return;
    }

    if (res.status === 400) {
      setServerError(
        "Link expirado ou inválido. Solicite um novo link de redefinição."
      );
      return;
    }

    setServerError("Erro ao redefinir senha. Tente novamente.");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Redefinir senha</h1>
        <p className="text-sm text-muted-foreground">
          Crie uma nova senha para sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">Nova senha</Label>
          <div className="relative">
            <Input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              data-testid="reset-password"
              className="pr-10"
              {...register("newPassword")}
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
          {errors.newPassword && (
            <p className="text-xs text-destructive" role="alert">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm">Confirmar senha</Label>
          <div className="relative">
            <Input
              id="reset-confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              data-testid="reset-confirm"
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

        {serverError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>
              {serverError}{" "}
              {serverError.includes("Link expirado") && (
                <Link href="/forgot-password" className="underline hover:no-underline">
                  Solicitar novo link
                </Link>
              )}
            </span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          disabled={isSubmitting}
          data-testid="reset-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando…
            </>
          ) : (
            "Salvar nova senha"
          )}
        </Button>
      </form>
    </div>
  );
}
