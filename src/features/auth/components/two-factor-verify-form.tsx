"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthPageShell } from "./auth-shell";

const FONT = "var(--font-space-grotesk), sans-serif";
const OTP_LENGTH = 6;

// ---------------------------------------------------------------------------
// OTP Boxes component
// ---------------------------------------------------------------------------

function OTPBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/[^0-9]/g, "").slice(-1);
    const arr = value.padEnd(OTP_LENGTH, " ").split("");
    arr[i] = digit || " ";
    const next = arr.join("").trimEnd();
    onChange(next);
    if (digit && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    if (pasted) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => {
        const v = value[i] ?? "";
        const filled = v.trim().length > 0;
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={v.trim()}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.32)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = filled ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)")}
            style={{
              width: "52px", height: "60px",
              textAlign: "center",
              background: filled ? "#1a1a1a" : "#161616",
              border: `1px solid ${filled ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "8px",
              color: "#efefef", fontSize: "22px", fontWeight: 500,
              fontFamily: FONT,
              outline: "none", transition: "border-color 0.15s, background 0.15s",
              caretColor: "#fff",
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recovery code input
// ---------------------------------------------------------------------------

function RecoveryInput({
  value,
  onChange,
  disabled,
  focused,
  onFocus,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder="XXXX-XXXX"
      maxLength={9}
      disabled={disabled}
      style={{
        width: "100%", padding: "13px 16px", boxSizing: "border-box",
        background: "#161616",
        border: `1px solid ${focused ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "7px", color: "#efefef", fontSize: "18px",
        fontFamily: FONT, fontWeight: 500, letterSpacing: "0.12em",
        outline: "none", transition: "border-color 0.18s ease", caretColor: "#fff",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export function TwoFactorVerifyForm() {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeValue = isRecoveryMode ? recoveryCode : code;
  const isCodeFilled = isRecoveryMode
    ? recoveryCode.trim().length >= 8
    : code.trim().length >= OTP_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isCodeFilled) return;
    setServerError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: codeValue.trim(),
        isRecoveryCode: isRecoveryMode,
        rememberDevice,
      }),
    });

    setIsSubmitting(false);

    if (res.status === 429) {
      setServerError("Muitas tentativas. Aguarde 1 minuto e tente novamente.");
      return;
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setServerError(body.error ?? "Código inválido. Tente novamente.");
      return;
    }

    const { nonce } = (await res.json()) as { nonce: string };
    await updateSession({ nonce });
    router.push("/org/select");
    router.refresh();
  }

  function toggleRecoveryMode() {
    setIsRecoveryMode((v) => !v);
    setServerError(null);
    setCode("");
    setRecoveryCode("");
  }

  return (
    <AuthPageShell
      topBarRight={
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "11px", color: "#3a3a3a",
          letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT,
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5a5a5a", display: "inline-block" }} />
          Segurança
        </div>
      }
      footer={
        <a
          href="/login"
          style={{
            fontSize: "12px", color: "#555", textDecoration: "none",
            fontFamily: FONT, letterSpacing: "0.02em",
            display: "inline-flex", alignItems: "center", gap: "6px",
          }}
        >
          ← Sair e voltar ao login
        </a>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
        {/* Shield icon */}
        <div style={{
          width: "56px", height: "56px", borderRadius: "12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#bdbdbd",
        }}>
          <ShieldIcon />
        </div>

        {/* Header */}
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
            letterSpacing: "0.16em", textTransform: "uppercase",
            marginBottom: "14px", fontFamily: FONT,
          }}>
            Segurança
          </div>
          <h2 style={{
            fontSize: "26px", fontWeight: 600, color: "#efefef",
            letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
          }}>
            Verificação em duas etapas
          </h2>
          <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.65, fontFamily: FONT }}>
            {isRecoveryMode
              ? "Insira um dos seus códigos de recuperação."
              : "Digite o código de 6 dígitos do seu aplicativo autenticador (Authy, 1Password, etc)."}
          </p>
        </div>

        {/* Code input */}
        <div>
          <label style={{
            display: "block", fontSize: "11px", fontWeight: 600, color: "#4a4a4a",
            letterSpacing: "0.09em", textTransform: "uppercase",
            marginBottom: "10px", fontFamily: FONT,
          }}>
            {isRecoveryMode ? "Código de recuperação" : "Código de verificação"}
          </label>
          {isRecoveryMode ? (
            <RecoveryInput
              value={recoveryCode}
              onChange={setRecoveryCode}
              disabled={isSubmitting}
              focused={inputFocused}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
          ) : (
            <OTPBoxes value={code} onChange={setCode} disabled={isSubmitting} />
          )}
        </div>

        {/* Remember device (only for TOTP mode) */}
        {!isRecoveryMode && (
          <label style={{
            display: "flex", alignItems: "center", gap: "10px",
            cursor: "pointer", userSelect: "none",
          }}>
            <span
              onClick={() => setRememberDevice((v) => !v)}
              style={{
                width: "18px", height: "18px", borderRadius: "5px",
                background: rememberDevice ? "#f0f0f0" : "rgba(255,255,255,0.04)",
                border: `1px solid ${rememberDevice ? "#f0f0f0" : "rgba(255,255,255,0.12)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#080808", transition: "all 0.15s", flexShrink: 0,
              }}
            >
              {rememberDevice && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              style={{ display: "none" }}
            />
            <span style={{ fontSize: "13px", color: "#9a9a9a", fontFamily: FONT }}>
              Lembrar este dispositivo por 30 dias
            </span>
          </label>
        )}

        {/* Error */}
        {serverError && (
          <div style={{
            padding: "11px 14px",
            background: "rgba(154,90,90,0.05)",
            border: "1px solid rgba(154,90,90,0.18)",
            borderRadius: "7px",
          }}>
            <p style={{ fontSize: "12px", color: "#b88a8a", fontFamily: FONT }}>{serverError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !isCodeFilled}
          style={{
            padding: "14px", borderRadius: "7px",
            background: isSubmitting || !isCodeFilled ? "rgba(240,240,240,0.4)" : "#f0f0f0",
            color: "#080808",
            fontSize: "14px", fontWeight: 600,
            fontFamily: FONT, border: "none",
            cursor: isSubmitting || !isCodeFilled ? "not-allowed" : "pointer",
            letterSpacing: "0.025em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "background 0.15s",
          }}
        >
          {isSubmitting && <SpinnerIcon />}
          {isSubmitting ? "Verificando…" : "Verificar"}
        </button>

        {/* Toggle recovery mode */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            type="button"
            onClick={toggleRecoveryMode}
            style={{
              fontSize: "12px", color: "#555", background: "none", border: "none",
              padding: 0, cursor: "pointer", fontFamily: FONT,
              letterSpacing: "0.02em", textDecoration: "none",
            }}
          >
            {isRecoveryMode ? "← Usar código do autenticador" : "Usar código de backup"}
          </button>
        </div>
      </form>
    </AuthPageShell>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
      <circle cx="12" cy="12" r="9" stroke="rgba(8,8,8,0.2)" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
