"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "./turnstile-widget";
import { AuthPageShell } from "./auth-shell";

const FONT = "var(--font-space-grotesk), sans-serif";

const formSchema = z.object({
  email: z.string().email("Email inválido"),
});

type FormData = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, turnstileToken: turnstileToken ?? "" }),
    });

    if (res.status === 200) {
      setSubmittedEmail(data.email);
      setSubmitted(true);
      return;
    }

    setTurnstileKey((k) => k + 1);
    setTurnstileToken(null);

    if (res.status === 429) {
      setServerError("Muitas tentativas. Tente novamente mais tarde.");
      return;
    }
    if (res.status === 400) {
      setServerError("Verificação anti-bot falhou. Tente novamente.");
      return;
    }
    setServerError("Erro ao processar solicitação. Tente novamente.");
  }

  function handleRetry() {
    setSubmitted(false);
    setSubmittedEmail("");
    setServerError(null);
    setTurnstileKey((k) => k + 1);
    setTurnstileToken(null);
  }

  return (
    <AuthPageShell
      topBarRight={
        <a
          href="/login"
          style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            fontSize: "12px", color: "#555", textDecoration: "none",
            fontFamily: FONT, letterSpacing: "0.02em", transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#bbb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
        >
          ← Login
        </a>
      }
      footer={
        <p style={{ fontSize: "12px", color: "#333", fontFamily: FONT }}>
          Lembrou a senha?{" "}
          <a href="/login" style={{ color: "#666", textDecoration: "none" }}>Entrar</a>
        </p>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "26px", paddingTop: "8px", paddingBottom: "8px" }}>

        {/* Lock icon */}
        <div style={{
          width: "56px", height: "56px", borderRadius: "12px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#bdbdbd",
        }}>
          <Lock size={22} strokeWidth={1.5} />
        </div>

        {/* Header */}
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
            letterSpacing: "0.16em", textTransform: "uppercase",
            marginBottom: "14px", fontFamily: FONT,
          }}>
            Recuperação
          </div>
          <h2 style={{
            fontSize: "26px", fontWeight: 600, color: "#efefef",
            letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
          }}>
            {submitted ? "Confira seu email" : "Esqueceu a senha?"}
          </h2>
          <p style={{ fontSize: "13px", color: "#4a4a4a", lineHeight: 1.6, fontFamily: FONT }}>
            {submitted
              ? "Se o endereço estiver registrado, enviamos um link para criar uma nova senha. O link expira em 30 minutos."
              : "Sem problemas. Informe o email da sua conta e enviaremos um link para criar uma nova senha."}
          </p>
        </div>

        {/* ── Form state ───────────────────────────────────────────────── */}
        {!submitted && (
          <>
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email da conta</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  data-testid="forgot-email"
                  {...register("email")}
                />
                {errors.email && (
                  <p style={{ fontSize: "11px", color: "#9a5a5a", fontFamily: FONT }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

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
                className="w-full"
                disabled={isSubmitting}
                data-testid="forgot-submit"
              >
                {isSubmitting ? (
                  <><Loader2 className="size-4 animate-spin" /> Enviando…</>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>
            </form>

            {/* Info box */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "13px 14px",
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "7px",
            }}>
              <div style={{
                marginTop: "2px", width: "14px", height: "14px", borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", color: "#666", fontFamily: FONT, fontWeight: 600, flexShrink: 0,
              }}>
                i
              </div>
              <p style={{ fontSize: "11.5px", color: "#5a5a5a", lineHeight: 1.55, fontFamily: FONT }}>
                Por segurança, não confirmamos se um email existe na nossa base. Se sua conta estiver
                ativa, o link chegará em até 1 minuto.
              </p>
            </div>
          </>
        )}

        {/* ── Sent state ───────────────────────────────────────────────── */}
        {submitted && (
          <>
            {/* Email card */}
            <div style={{
              background: "rgba(255,255,255,0.022)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "9px", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "7px",
                background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#7a7a7a", flexShrink: 0,
              }}>
                <Mail size={16} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "10px", fontWeight: 600, color: "#3a3a3a",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  fontFamily: FONT, marginBottom: "3px",
                }}>
                  Enviado para
                </div>
                <div style={{
                  fontSize: "14px", color: "#d8d8d8", fontFamily: FONT,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {submittedEmail}
                </div>
              </div>
            </div>

            {/* Open inbox button */}
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", width: "100%", padding: "14px",
                background: "#f0f0f0", borderRadius: "7px",
                color: "#080808", fontSize: "14px", fontWeight: 600,
                fontFamily: FONT, textAlign: "center", textDecoration: "none",
                letterSpacing: "0.025em", transition: "background 0.18s ease",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e8e8e8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f0f0f0")}
            >
              Abrir caixa de entrada
            </a>

            <button
              type="button"
              onClick={handleRetry}
              style={{
                fontSize: "12px", color: "#666", background: "none",
                border: "none", padding: 0, cursor: "pointer",
                fontFamily: FONT, textAlign: "left",
              }}
            >
              Usar outro email →
            </button>
          </>
        )}
      </div>
    </AuthPageShell>
  );
}
