"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { AuthPageShell } from "@/features/auth/components/auth-shell";
import { TurnstileWidget } from "@/features/auth/components/turnstile-widget";

const FONT = "var(--font-space-grotesk), sans-serif";
const INITIAL_COUNTDOWN = 42;

type Status = "idle" | "loading" | "error" | "rate-limited" | "bot";

// ---------------------------------------------------------------------------
// Inner component — needs useSearchParams → must be inside Suspense
// ---------------------------------------------------------------------------

function PendingContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";

  // Se não vier email na URL, mostra primeiro um campo para digitá-lo
  const [confirmedEmail, setConfirmedEmail] = useState(emailParam);
  const [emailInput, setEmailInput] = useState(emailParam);
  const [emailFocused, setEmailFocused] = useState(false);

  const email = confirmedEmail;
  const emailKnown = !!confirmedEmail;

  const [status, setStatus] = useState<Status>("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [seconds, setSeconds] = useState(INITIAL_COUNTDOWN);
  const [resent, setResent] = useState(false);

  // Countdown timer — só roda quando o email já é conhecido
  useEffect(() => {
    if (!emailKnown || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, emailKnown]);

  const isLoading = status === "loading";
  const canResend = seconds <= 0 && !isLoading && emailKnown;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const countdownLabel = `${min}:${String(sec).padStart(2, "0")}`;
  const btnEnabled = canResend && turnstileToken !== null;

  async function handleResend() {
    if (!btnEnabled) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });

      if (res.status === 429) {
        setStatus("rate-limited");
      } else if (res.status === 400) {
        setStatus("bot");
        setTurnstileKey((k) => k + 1);
        setTurnstileToken(null);
      } else if (!res.ok) {
        setStatus("error");
      } else {
        setResent(true);
        setStatus("idle");
        setSeconds(60);
        setTurnstileKey((k) => k + 1);
        setTurnstileToken(null);
        setTimeout(() => setResent(false), 2500);
      }
    } catch {
      setStatus("error");
    }
  }

  // ── Estado: email ainda não informado ─────────────────────────────────────
  if (!emailKnown) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingTop: "8px", paddingBottom: "8px" }}>
        {/* Mail icon */}
        <div style={{
          width: "56px", height: "56px", borderRadius: "12px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#bdbdbd",
        }}>
          <Mail size={24} strokeWidth={1.5} />
        </div>

        {/* Header */}
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
            letterSpacing: "0.16em", textTransform: "uppercase",
            marginBottom: "14px", fontFamily: FONT,
          }}>
            Verificar email
          </div>
          <h2 style={{
            fontSize: "26px", fontWeight: 600, color: "#efefef",
            letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
          }}>
            Qual é o seu email?
          </h2>
          <p style={{ fontSize: "13px", color: "#4a4a4a", lineHeight: 1.6, fontFamily: FONT }}>
            Informe o email cadastrado para reenviarmos o link de verificação.
          </p>
        </div>

        {/* Email input */}
        <div>
          <label style={{
            display: "block", fontSize: "11px", fontWeight: 600, color: "#4a4a4a",
            letterSpacing: "0.09em", textTransform: "uppercase",
            marginBottom: "8px", fontFamily: FONT,
          }}>
            Email
          </label>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && emailInput.includes("@")) {
                setConfirmedEmail(emailInput.trim());
              }
            }}
            placeholder="seu@email.com"
            autoFocus
            style={{
              width: "100%", padding: "13px 16px", boxSizing: "border-box" as const,
              background: "#161616",
              border: `1px solid ${emailFocused ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "7px", color: "#efefef", fontSize: "14px",
              fontFamily: FONT, outline: "none",
              transition: "border-color 0.18s ease", caretColor: "#fff",
            }}
          />
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => {
            if (emailInput.includes("@")) setConfirmedEmail(emailInput.trim());
          }}
          disabled={!emailInput.includes("@")}
          style={{
            padding: "14px", borderRadius: "7px",
            background: emailInput.includes("@") ? "#f0f0f0" : "rgba(240,240,240,0.4)",
            color: "#080808", fontSize: "14px", fontWeight: 600,
            fontFamily: FONT, border: "none",
            cursor: emailInput.includes("@") ? "pointer" : "not-allowed",
            letterSpacing: "0.025em",
          }}
        >
          Continuar
        </button>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

        <a
          href="/login"
          style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            fontSize: "12px", color: "#555", textDecoration: "none",
            fontFamily: FONT, letterSpacing: "0.02em",
          }}
        >
          ← Voltar para login
        </a>
      </div>
    );
  }

  // ── Estado: email conhecido → UI normal ───────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingTop: "8px", paddingBottom: "8px" }}>

      {/* Mail icon + check badge */}
      <div style={{ position: "relative", width: "56px", height: "56px" }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "12px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#bdbdbd",
        }}>
          <Mail size={24} strokeWidth={1.5} />
        </div>
        <div style={{
          position: "absolute", bottom: "-4px", right: "-4px",
          width: "22px", height: "22px", borderRadius: "50%",
          background: "#f0f0f0", color: "#080808",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "3px solid #0d0d0d",
        }}>
          <CheckCircle size={11} strokeWidth={2.6} />
        </div>
      </div>

      {/* Header */}
      <div>
        <div style={{
          fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
          letterSpacing: "0.16em", textTransform: "uppercase",
          marginBottom: "14px", fontFamily: FONT,
        }}>
          Verifique seu email
        </div>
        <h2 style={{
          fontSize: "26px", fontWeight: 600, color: "#efefef",
          letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
        }}>
          Confirme que é você
        </h2>
        <p style={{ fontSize: "13px", color: "#4a4a4a", lineHeight: 1.6, fontFamily: FONT }}>
          Enviamos um link de confirmação. Abra-o no mesmo dispositivo para ativar sua conta.
        </p>
      </div>

      {/* Email destination card */}
      <div style={{
        background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.07)",
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
            {email || "o seu endereço de email"}
          </div>
        </div>
        <div style={{
          fontSize: "10px", color: "#5a5a5a", fontFamily: FONT,
          letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0,
        }}>
          Pendente
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[
          "Abra o email enviado por nós",
          'Clique em "Verificar minha conta"',
          "Pronto — você será redirecionado",
        ].map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "22px", height: "22px", borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", color: "#666", fontFamily: FONT, fontWeight: 500, flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <span style={{ fontSize: "13px", color: "#7a7a7a", fontFamily: FONT }}>{step}</span>
          </div>
        ))}
      </div>

      {/* Error feedback */}
      {(status === "error" || status === "rate-limited" || status === "bot") && (
        <p style={{ fontSize: "12px", color: "#8a4a4a", fontFamily: FONT }}>
          {status === "rate-limited"
            ? "Muitas tentativas. Aguarde alguns minutos."
            : status === "bot"
              ? "Verificação anti-bot falhou. Tente novamente."
              : "Falha ao enviar. Tente novamente."}
        </p>
      )}

      {/* Resend row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "#4a4a4a", fontFamily: FONT }}>
          {resent
            ? "Email reenviado."
            : canResend
              ? "Não recebeu nada?"
              : `Reenviar em ${countdownLabel}`}
        </span>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={!btnEnabled || isLoading}
          style={{
            fontSize: "12px",
            color: btnEnabled ? "#d8d8d8" : "#333",
            background: "none", border: "none", padding: 0,
            cursor: btnEnabled ? "pointer" : "not-allowed",
            fontFamily: FONT, fontWeight: 600, letterSpacing: "0.02em",
            textDecoration: btnEnabled ? "underline" : "none",
            textUnderlineOffset: "3px",
            display: "flex", alignItems: "center", gap: "6px",
          }}
        >
          {isLoading && <Loader2 size={12} className="animate-spin" />}
          Reenviar email
        </button>
      </div>

      {/* Turnstile — only mount when countdown expired */}
      {canResend && (
        <TurnstileWidget
          key={turnstileKey}
          onToken={(t) => setTurnstileToken(t)}
          onExpire={() => setTurnstileToken(null)}
        />
      )}

      <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

      {/* Back link */}
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
        ← Voltar para login
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VerifyEmailPendingPage() {
  return (
    <AuthPageShell
      topBarRight={
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "11px", color: "#3a3a3a",
          letterSpacing: "0.12em", textTransform: "uppercase",
          fontFamily: FONT,
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "#5a5a5a", display: "inline-block",
          }} />
          Passo 2 de 3
        </div>
      }
      footer={
        <p style={{ fontSize: "12px", color: "#333", fontFamily: FONT }}>
          Email errado?{" "}
          <a href="/signup" style={{ color: "#666", textDecoration: "none" }}>
            Alterar cadastro
          </a>
        </p>
      }
    >
      <Suspense fallback={<div style={{ height: "400px" }} />}>
        <PendingContent />
      </Suspense>
    </AuthPageShell>
  );
}
