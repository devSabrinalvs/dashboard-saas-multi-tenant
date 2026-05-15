"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "./auth-shell";

const FONT = "var(--font-space-grotesk), sans-serif";

// Password strength score: 0..4
function evaluatePwd(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["", "Fraca", "Razoável", "Boa", "Forte"];

const formSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .refine((v) => /\d/.test(v), "Deve conter pelo menos 1 número")
      .refine((v) => /[^a-zA-Z0-9]/.test(v), "Deve conter pelo menos 1 símbolo"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

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
  } = useForm<FormData>({ resolver: zodResolver(formSchema) });

  const pwd = watch("newPassword") ?? "";
  const confirm = watch("confirmPassword") ?? "";
  const strength = evaluatePwd(pwd);
  const passwordsMatch = pwd.length > 0 && confirm.length > 0 && pwd === confirm;

  const barColor = (i: number): string => {
    if (i >= strength) return "rgba(255,255,255,0.05)";
    if (strength <= 1) return "#5a5a5a";
    if (strength <= 2) return "#888";
    return "#e8e8e8";
  };

  const checks = [
    { ok: pwd.length >= 8, label: "Pelo menos 8 caracteres" },
    { ok: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd), label: "Maiúscula e minúscula" },
    { ok: /\d/.test(pwd), label: "Pelo menos 1 número" },
    { ok: /[^A-Za-z0-9]/.test(pwd), label: "Pelo menos 1 símbolo" },
  ];

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
      setServerError("Link expirado ou inválido. Solicite um novo link de redefinição.");
      return;
    }
    setServerError("Erro ao redefinir senha. Tente novamente.");
  }

  return (
    <AuthPageShell
      topBarRight={
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "11px", color: "#3a3a3a",
          letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT,
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "#5a5a5a", display: "inline-block",
          }} />
          Link verificado
        </div>
      }
      footer={
        <p style={{ fontSize: "12px", color: "#333", fontFamily: FONT }}>
          Precisa de ajuda?{" "}
          <a href="#" style={{ color: "#666", textDecoration: "none" }}>Falar com suporte</a>
        </p>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "22px", paddingTop: "8px", paddingBottom: "8px" }}>

        {/* Header */}
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
            letterSpacing: "0.16em", textTransform: "uppercase",
            marginBottom: "14px", fontFamily: FONT,
          }}>
            Recuperação · Etapa final
          </div>
          <h2 style={{
            fontSize: "26px", fontWeight: 600, color: "#efefef",
            letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
          }}>
            Crie uma nova senha
          </h2>
          <p style={{ fontSize: "13px", color: "#4a4a4a", lineHeight: 1.6, fontFamily: FONT }}>
            Escolha algo forte e único. Você usará essa senha para entrar em projorg.io.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: "22px" }}
        >
          {/* New password field */}
          <div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.newPassword}
                  className="pr-10"
                  data-testid="reset-password"
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
              {errors.newPassword && (
                <p style={{ fontSize: "11px", color: "#9a5a5a", fontFamily: FONT }}>
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Strength meter — only when password has input */}
            {pwd.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: "3px", borderRadius: "2px",
                        background: barColor(i), transition: "background 0.2s",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: "10px", color: "#5a5a5a", letterSpacing: "0.1em",
                    textTransform: "uppercase", fontFamily: FONT, fontWeight: 600,
                  }}>
                    Força
                  </span>
                  <span style={{
                    fontSize: "11px",
                    color: strength >= 3 ? "#d8d8d8" : strength >= 2 ? "#888" : "#666",
                    fontFamily: FONT, fontWeight: 500,
                  }}>
                    {STRENGTH_LABELS[strength]}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm password field */}
          <div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm">Confirme a senha</Label>
              <div className="relative">
                <Input
                  id="reset-confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  className="pr-10"
                  data-testid="reset-confirm"
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
                <p style={{ fontSize: "11px", color: "#9a5a5a", fontFamily: FONT }}>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Match indicator */}
            {confirm.length > 0 && (
              <div style={{
                marginTop: "10px",
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "11px",
                color: passwordsMatch ? "#9c9c9c" : "#6a4a4a",
                fontFamily: FONT,
              }}>
                <span style={{
                  width: "14px", height: "14px", borderRadius: "50%",
                  background: passwordsMatch ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${passwordsMatch ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: passwordsMatch ? "#cfcfcf" : "#6a4a4a",
                  fontSize: "9px", flexShrink: 0,
                }}>
                  {passwordsMatch ? "✓" : "×"}
                </span>
                {passwordsMatch ? "As senhas coincidem" : "As senhas não coincidem"}
              </div>
            )}
          </div>

          {/* Requirements grid */}
          <div style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "7px",
          }}>
            <div style={{
              fontSize: "10px", fontWeight: 600, color: "#4a4a4a",
              letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: FONT, marginBottom: "10px",
            }}>
              Requisitos
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              {checks.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    width: "14px", height: "14px", borderRadius: "50%",
                    background: c.ok ? "rgba(255,255,255,0.08)" : "transparent",
                    border: `1px solid ${c.ok ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: c.ok ? "#d8d8d8" : "#333",
                    flexShrink: 0, fontSize: "8px",
                  }}>
                    {c.ok ? (
                      "✓"
                    ) : (
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#333", display: "inline-block" }} />
                    )}
                  </span>
                  <span style={{
                    fontSize: "11.5px",
                    color: c.ok ? "#9c9c9c" : "#4a4a4a",
                    fontFamily: FONT,
                  }}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Server error */}
          {serverError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "8px",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(200,80,80,0.15)",
              borderRadius: "7px",
              fontSize: "12px", color: "#9a5a5a", fontFamily: FONT,
            }}>
              <AlertCircle size={14} style={{ marginTop: "1px", flexShrink: 0 }} />
              <span>
                {serverError}{" "}
                {serverError.includes("Link expirado") && (
                  <Link
                    href="/forgot-password"
                    style={{ color: "#888", textDecoration: "underline" }}
                  >
                    Solicitar novo link
                  </Link>
                )}
              </span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            data-testid="reset-submit"
          >
            {isSubmitting ? (
              <><Loader2 className="size-4 animate-spin" /> Salvando…</>
            ) : (
              "Redefinir senha"
            )}
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
