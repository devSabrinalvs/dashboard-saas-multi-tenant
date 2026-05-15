import Link from "next/link";
import { hashToken } from "@/server/auth/token";
import { findValidResetToken } from "@/server/repo/password-reset-token-repo";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { AuthPageShell } from "@/features/auth/components/auth-shell";

const FONT = "var(--font-space-grotesk), sans-serif";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <ResetError reason="missing" />;
  }

  const tokenHash = hashToken(token);
  const record = await findValidResetToken(tokenHash);

  if (!record) {
    return <ResetError reason="invalid" />;
  }

  return <ResetPasswordForm token={token} />;
}

// ---------------------------------------------------------------------------
// Error state — also uses the auth shell design
// ---------------------------------------------------------------------------

function ResetError({ reason }: { reason: "missing" | "invalid" }) {
  const title =
    reason === "missing" ? "Link incompleto" : "Link expirado ou inválido";

  const description =
    reason === "missing"
      ? "O link de redefinição está incompleto. Clique no link completo do email ou solicite um novo."
      : "Este link de redefinição expirou ou já foi utilizado. Solicite um novo link abaixo.";

  return (
    <AuthPageShell
      footer={
        <p style={{ fontSize: "12px", color: "#333", fontFamily: FONT }}>
          Lembrou a senha?{" "}
          <a href="/login" style={{ color: "#666", textDecoration: "none" }}>Entrar</a>
        </p>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
        {/* Warning icon */}
        <div style={{
          width: "56px", height: "56px", borderRadius: "12px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,80,80,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg
            width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="#9a5a5a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
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
            {title}
          </h2>
          <p style={{ fontSize: "13px", color: "#4a4a4a", lineHeight: 1.6, fontFamily: FONT }}>
            {description}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link
            href="/forgot-password"
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
          <Link
            href="/login"
            style={{
              display: "block", textAlign: "center",
              fontSize: "12px", color: "#555", textDecoration: "none", fontFamily: FONT,
            }}
          >
            ← Voltar para o login
          </Link>
        </div>
      </div>
    </AuthPageShell>
  );
}
