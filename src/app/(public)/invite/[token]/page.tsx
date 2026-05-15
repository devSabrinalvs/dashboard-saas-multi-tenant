import Link from "next/link";
import { getSession } from "@/auth";
import { findInviteByToken } from "@/server/repo/invite-repo";
import { AcceptInviteButton } from "@/components/invite/accept-invite-button";
import { AuthPageShell } from "@/features/auth/components/auth-shell";

const FONT = "var(--font-space-grotesk), sans-serif";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [session, invite] = await Promise.all([
    getSession(),
    findInviteByToken(token),
  ]);

  const loggedInEmail = session?.user?.email ?? null;

  // ── Invalid / revoked ────────────────────────────────────────────────────
  if (!invite || invite.status === "REVOKED") {
    return (
      <InviteShell state="invalid" footer={
        <Link href="/login" style={ghostLinkStyle}>← Voltar para login</Link>
      }>
        <InvalidContent reason="invalid" />
      </InviteShell>
    );
  }

  // ── Expired ─────────────────────────────────────────────────────────────
  if (invite.expiresAt < new Date()) {
    return (
      <InviteShell state="invalid" footer={
        <Link href="/login" style={ghostLinkStyle}>← Voltar para login</Link>
      }>
        <InvalidContent reason="expired" />
      </InviteShell>
    );
  }

  // ── Already accepted ─────────────────────────────────────────────────────
  if (invite.status === "ACCEPTED") {
    return (
      <InviteShell state="invalid" footer={
        <Link href={`/org/${invite.organization.slug}/dashboard`} style={ghostLinkStyle}>
          Ir para o dashboard →
        </Link>
      }>
        <InvalidContent reason="used" orgName={invite.organization.name} orgSlug={invite.organization.slug} />
      </InviteShell>
    );
  }

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!loggedInEmail) {
    return (
      <InviteShell state="loggedOut" footer={
        <p style={{ fontSize: "12px", color: "#333", fontFamily: FONT }}>
          Ao aceitar, você concorda com os{" "}
          <a href="/terms" style={{ color: "#666", textDecoration: "none" }}>termos de uso</a>.
        </p>
      }>
        <ValidContent
          state="loggedOut"
          token={token}
          orgName={invite.organization.name}
          inviteEmail={invite.email}
        />
      </InviteShell>
    );
  }

  // ── Logged in but wrong email ────────────────────────────────────────────
  if (loggedInEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <InviteShell state="loggedIn" footer={
        <p style={{ fontSize: "12px", color: "#333", fontFamily: FONT }}>
          Faça login com <span style={{ color: "#666" }}>{invite.email}</span> para aceitar.
        </p>
      }>
        <WrongEmailContent
          inviteEmail={invite.email}
          loggedInEmail={loggedInEmail}
          token={token}
          orgName={invite.organization.name}
        />
      </InviteShell>
    );
  }

  // ── Logged in with correct email — can accept ────────────────────────────
  return (
    <InviteShell state="loggedIn" footer={
      <p style={{ fontSize: "12px", color: "#333", fontFamily: FONT }}>
        Ao aceitar, você concorda com os{" "}
        <a href="/terms" style={{ color: "#666", textDecoration: "none" }}>termos de uso</a>.
      </p>
    }>
      <ValidContent
        state="loggedIn"
        token={token}
        orgName={invite.organization.name}
        inviteEmail={invite.email}
        loggedInEmail={loggedInEmail}
      />
    </InviteShell>
  );
}

// ---------------------------------------------------------------------------
// Shell wrapper
// ---------------------------------------------------------------------------

function InviteShell({
  children,
  footer,
  state,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  state: "loggedOut" | "loggedIn" | "invalid";
}) {
  const badge = state === "invalid" ? "Convite" : state === "loggedOut" ? "Convite" : "Convite";
  return (
    <AuthPageShell
      topBarRight={
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#3a3a3a", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5a5a5a", display: "inline-block" }} />
          {badge}
        </div>
      }
      footer={footer}
    >
      {children}
    </AuthPageShell>
  );
}

// ---------------------------------------------------------------------------
// Invalid / expired / already-used content
// ---------------------------------------------------------------------------

function InvalidContent({
  reason,
  orgName,
  orgSlug,
}: {
  reason: "invalid" | "expired" | "used";
  orgName?: string;
  orgSlug?: string;
}) {
  const title =
    reason === "used"
      ? "Convite já utilizado"
      : "Convite inválido ou expirado";
  const description =
    reason === "used"
      ? `Este convite para ${orgName ?? "a organização"} já foi aceito.`
      : reason === "expired"
        ? "Convites são válidos por 7 dias. Peça para o administrador da organização enviar um novo link."
        : "Este link de convite não é válido ou foi revogado. Peça um novo convite ao administrador.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "12px",
        background: "rgba(154,90,90,0.08)",
        border: "1px solid rgba(154,90,90,0.22)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#b88a8a",
      }}>
        <AlertIcon />
      </div>

      <div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#5a5a5a", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "14px", fontFamily: FONT }}>
          Convite
        </div>
        <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#efefef", letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT }}>
          {title}
        </h2>
        <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.65, fontFamily: FONT }}>
          {description}
        </p>
      </div>

      {reason === "used" && orgSlug ? (
        <Link
          href={`/org/${orgSlug}/dashboard`}
          style={primaryBtnStyle}
        >
          Ir para o dashboard
        </Link>
      ) : (
        <Link href="/login" style={primaryBtnStyle}>
          Voltar para login
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Valid invite content (loggedOut | loggedIn)
// ---------------------------------------------------------------------------

function ValidContent({
  state,
  token,
  orgName,
  inviteEmail,
  loggedInEmail,
}: {
  state: "loggedOut" | "loggedIn";
  token: string;
  orgName: string;
  inviteEmail: string;
  loggedInEmail?: string | null;
}) {
  const initials = orgName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
      {/* Building icon */}
      <div style={{
        width: "56px", height: "56px", borderRadius: "12px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#bdbdbd",
      }}>
        <BuildingIcon />
      </div>

      {/* Header */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#5a5a5a", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "14px", fontFamily: FONT }}>
          Convite
        </div>
        <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#efefef", letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT }}>
          Você foi convidado
        </h2>
        <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.65, fontFamily: FONT }}>
          Você foi convidado para colaborar na organização:
        </p>
      </div>

      {/* Org card */}
      <div style={{
        background: "rgba(255,255,255,0.022)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px", padding: "18px",
        display: "flex", alignItems: "center", gap: "14px",
      }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "8px",
          background: "#1f2630",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          fontSize: "15px", fontWeight: 600, color: "#bdbdbd",
          fontFamily: FONT, letterSpacing: "0.02em",
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "17px", fontWeight: 600, color: "#e8e8e8", fontFamily: FONT, letterSpacing: "-0.01em", marginBottom: "4px" }}>
            {orgName}
          </div>
          <div style={{ fontSize: "12px", color: "#5a5a5a", fontFamily: FONT }}>
            {inviteEmail}
          </div>
        </div>
      </div>

      {/* If logged in, show "accepting as" chip */}
      {state === "loggedIn" && loggedInEmail && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 12px",
          background: "rgba(255,255,255,0.018)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "7px",
        }}>
          <div style={{
            width: "24px", height: "24px", borderRadius: "50%",
            background: "#2c2c2c", color: "#888",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "10px", fontWeight: 600, fontFamily: FONT, flexShrink: 0,
          }}>
            {loggedInEmail.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ fontSize: "12px", color: "#5a5a5a", fontFamily: FONT }}>Aceitando como</span>
          <span style={{ fontSize: "12px", color: "#cfcfcf", fontWeight: 500, fontFamily: FONT, marginLeft: "auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {loggedInEmail}
          </span>
        </div>
      )}

      {/* CTAs */}
      {state === "loggedOut" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link href={`/login?callbackUrl=/invite/${token}`} style={primaryBtnStyle}>
            Fazer login para aceitar
          </Link>
          <Link href={`/signup?callbackUrl=/invite/${token}`} style={ghostBtnStyle}>
            Criar conta nova
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 2 }}>
            <AcceptInviteButton token={token} />
          </div>
          <Link href="/org/select" style={{ ...ghostBtnStyle, flex: 1, textAlign: "center" }}>
            Recusar
          </Link>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrong email content
// ---------------------------------------------------------------------------

function WrongEmailContent({
  inviteEmail,
  loggedInEmail,
  token,
  orgName,
}: {
  inviteEmail: string;
  loggedInEmail: string;
  token: string;
  orgName: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "12px",
        background: "rgba(154,90,90,0.08)",
        border: "1px solid rgba(154,90,90,0.22)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#b88a8a",
      }}>
        <AlertIcon />
      </div>

      <div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#5a5a5a", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "14px", fontFamily: FONT }}>
          Convite
        </div>
        <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#efefef", letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT }}>
          Email diferente
        </h2>
        <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.65, fontFamily: FONT }}>
          Este convite para <span style={{ color: "#cfcfcf" }}>{orgName}</span> foi enviado para{" "}
          <span style={{ color: "#cfcfcf" }}>{inviteEmail}</span>, mas você está logado como{" "}
          <span style={{ color: "#cfcfcf" }}>{loggedInEmail}</span>.
        </p>
      </div>

      <Link href={`/login?callbackUrl=/invite/${token}`} style={primaryBtnStyle}>
        Entrar com outro email
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles & icons
// ---------------------------------------------------------------------------

const primaryBtnStyle: React.CSSProperties = {
  display: "block", textAlign: "center",
  padding: "14px", borderRadius: "7px",
  background: "#f0f0f0", color: "#080808",
  fontSize: "14px", fontWeight: 600,
  fontFamily: FONT, textDecoration: "none",
  letterSpacing: "0.025em",
};

const ghostBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "14px 12px", borderRadius: "7px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#7a7a7a",
  fontSize: "13px", fontWeight: 500,
  fontFamily: FONT, textDecoration: "none",
  letterSpacing: "0.02em",
};

const ghostLinkStyle: React.CSSProperties = {
  fontSize: "12px", color: "#555", textDecoration: "none",
  fontFamily: FONT, letterSpacing: "0.02em",
  display: "inline-flex", alignItems: "center", gap: "6px",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "3px 9px",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "20px",
      fontSize: "10.5px", fontWeight: 600,
      letterSpacing: "0.06em", color: "#bdbdbd",
      fontFamily: FONT, textTransform: "uppercase",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#888" }} />
      {role}
    </span>
  );
}

function BuildingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
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
