import Link from "next/link";
import { InvalidTokenError } from "@/server/errors/auth-errors";
import { verifyEmailToken } from "@/server/use-cases/verify-email-token";
import { AuthPageShell } from "@/features/auth/components/auth-shell";

const FONT = "var(--font-space-grotesk), sans-serif";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <VerifyError reason="missing" />;
  }

  try {
    await verifyEmailToken(token);
    return <VerifySuccess />;
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return <VerifyError reason="invalid" />;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

function VerifySuccess() {
  return (
    <AuthPageShell
      topBarRight={
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "11px", color: "#3a3a3a",
          letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT,
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5a5a5a", display: "inline-block" }} />
          Verificado
        </div>
      }
      footer={
        <a
          href="/"
          style={{ fontSize: "12px", color: "#555", textDecoration: "none", fontFamily: FONT,
            display: "inline-flex", alignItems: "center", gap: "6px", letterSpacing: "0.02em" }}
        >
          Ir para o início →
        </a>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Icon with pulse ring */}
        <div style={{ position: "relative", width: "56px", height: "56px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "12px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#e8e8e8",
          }}>
            <CheckIcon />
          </div>
          {/* Pulse ring */}
          <div style={{
            position: "absolute", inset: "-10px", borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none",
          }} />
        </div>

        {/* Header */}
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
            letterSpacing: "0.16em", textTransform: "uppercase",
            marginBottom: "14px", fontFamily: FONT,
          }}>
            Email verificado
          </div>
          <h2 style={{
            fontSize: "26px", fontWeight: 600, color: "#efefef",
            letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
          }}>
            Tudo certo!
          </h2>
          <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.65, fontFamily: FONT }}>
            Sua conta está ativa. Você já pode entrar e configurar seu workspace.
          </p>
        </div>

        {/* Confirmation card */}
        <div style={{
          background: "rgba(255,255,255,0.022)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "9px", padding: "14px 16px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "7px",
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#7a7a7a", flexShrink: 0,
          }}>
            <MailIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "10px", fontWeight: 600, color: "#3a3a3a",
              letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: "3px", fontFamily: FONT,
            }}>
              Conta confirmada
            </div>
            <div style={{ fontSize: "13px", color: "#7a7a7a", fontFamily: FONT }}>
              Seu email foi verificado com sucesso
            </div>
          </div>
          <SmallCheck />
        </div>

        {/* CTA */}
        <Link
          href="/login"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "14px", borderRadius: "7px",
            background: "#f0f0f0", color: "#080808",
            fontSize: "14px", fontWeight: 600,
            fontFamily: FONT, textDecoration: "none",
            letterSpacing: "0.025em",
          }}
        >
          Entrar na conta →
        </Link>
      </div>
    </AuthPageShell>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function VerifyError({ reason }: { reason: "missing" | "invalid" }) {
  const title =
    reason === "missing" ? "Link incompleto" : "Link inválido ou expirado";
  const description =
    reason === "missing"
      ? "O link de verificação está incompleto. Clique no link completo do email ou solicite um novo."
      : "Este link já foi usado ou passou da validade de 24h. Solicite um novo abaixo — enviamos em alguns segundos.";

  return (
    <AuthPageShell
      topBarRight={
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "11px", color: "#3a3a3a",
          letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT,
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5a5a5a", display: "inline-block" }} />
          Falha
        </div>
      }
      footer={
        <Link
          href="/login"
          style={{ fontSize: "12px", color: "#555", textDecoration: "none", fontFamily: FONT,
            display: "inline-flex", alignItems: "center", gap: "6px", letterSpacing: "0.02em" }}
        >
          ← Voltar para login
        </Link>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
        {/* Error icon */}
        <div style={{
          width: "56px", height: "56px", borderRadius: "12px",
          background: "rgba(154,90,90,0.08)",
          border: "1px solid rgba(154,90,90,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#b88a8a",
        }}>
          <AlertIcon />
        </div>

        {/* Header */}
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
            letterSpacing: "0.16em", textTransform: "uppercase",
            marginBottom: "14px", fontFamily: FONT,
          }}>
            Verificação
          </div>
          <h2 style={{
            fontSize: "26px", fontWeight: 600, color: "#efefef",
            letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
          }}>
            {title}
          </h2>
          <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.65, fontFamily: FONT }}>
            {description}
          </p>
        </div>

        {/* Alert box */}
        <div style={{
          padding: "13px 14px",
          background: "rgba(154,90,90,0.05)",
          border: "1px solid rgba(154,90,90,0.18)",
          borderRadius: "7px",
          display: "flex", alignItems: "flex-start", gap: "10px",
        }}>
          <div style={{
            width: "18px", height: "18px", borderRadius: "50%",
            background: "rgba(154,90,90,0.15)",
            border: "1px solid rgba(154,90,90,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#b88a8a", flexShrink: 0, marginTop: "1px",
          }}>
            <SmallAlert />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#b88a8a", marginBottom: "2px", fontFamily: FONT }}>
              Token inválido
            </div>
            <p style={{ fontSize: "11.5px", color: "#7a5a5a", lineHeight: 1.55, fontFamily: FONT }}>
              Se você acabou de criar a conta, verifique se está usando o link mais recente que enviamos.
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/verify-email/pending"
          style={{
            display: "block", textAlign: "center",
            padding: "14px", borderRadius: "7px",
            background: "#f0f0f0", color: "#080808",
            fontSize: "14px", fontWeight: 600,
            fontFamily: FONT, textDecoration: "none",
            letterSpacing: "0.025em",
          }}
        >
          Solicitar novo link
        </Link>
      </div>
    </AuthPageShell>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SmallCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#7a7a7a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SmallAlert() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
