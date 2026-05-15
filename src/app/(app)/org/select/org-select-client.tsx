"use client";

import { useState } from "react";
import Link from "next/link";
import { CenteredShell } from "@/features/auth/components/auth-shell";
import type { Organization } from "@/generated/prisma/client";

const FONT = "var(--font-space-grotesk), sans-serif";

interface OrgSelectClientProps {
  orgs: Organization[];
}

export function OrgSelectClient({ orgs }: OrgSelectClientProps) {
  return (
    <CenteredShell
      topBarRight={
        <Link
          href="/api/auth/signout"
          style={{
            fontSize: "12px", color: "#555", textDecoration: "none",
            fontFamily: FONT, letterSpacing: "0.02em",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#bbb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
        >
          Sair
        </Link>
      }
      contentMaxWidth={460}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Header */}
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
            letterSpacing: "0.16em", textTransform: "uppercase",
            marginBottom: "14px", fontFamily: FONT,
          }}>
            Suas organizações
          </div>
          <h2 style={{
            fontSize: "26px", fontWeight: 600, color: "#efefef",
            letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
          }}>
            Onde você quer entrar?
          </h2>
          <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.65, fontFamily: FONT }}>
            Escolha uma organização para abrir o workspace. Você pode trocar a qualquer momento.
          </p>
        </div>

        {/* Org list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {orgs.map((org, i) => (
            <OrgRow key={org.id} org={org} focused={i === 0} />
          ))}
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "2px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
          <span style={{
            fontSize: "10px", color: "#3a3a3a",
            letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT,
          }}>ou</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Create org */}
        <CreateOrgButton />
      </div>
    </CenteredShell>
  );
}

// ---------------------------------------------------------------------------
// Org row card (interactive)
// ---------------------------------------------------------------------------

function OrgRow({ org, focused }: { org: Organization; focused: boolean }) {
  const [hovered, setHovered] = useState(focused);
  const initials = org.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <Link
      href={`/org/${org.slug}/dashboard`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(focused)}
      style={{
        width: "100%", textAlign: "left",
        display: "flex", alignItems: "center", gap: "14px",
        padding: "14px 16px",
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.022)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "9px",
        cursor: "pointer", transition: "all 0.16s",
        textDecoration: "none",
      }}
    >
      <OrgAvatar name={org.name} initials={initials} index={hovered ? 0 : 1} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "15px", fontWeight: 600, color: "#e8e8e8",
          letterSpacing: "-0.01em", marginBottom: "3px",
          fontFamily: FONT,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {org.name}
        </div>
        <div style={{ fontSize: "11px", color: "#5a5a5a", fontFamily: FONT }}>
          projorg.app/{org.slug}
        </div>
      </div>
      <ChevronRight hovered={hovered} />
    </Link>
  );
}

function OrgAvatar({ name, initials, index }: { name: string; initials: string; index: number }) {
  const bgs = ["#2a2a2a", "#23241f", "#1f2630", "#26221f", "#1f2422"];
  const bg = bgs[name.charCodeAt(0) % bgs.length] ?? bgs[0];
  void index;
  return (
    <div style={{
      width: "40px", height: "40px", borderRadius: "8px",
      background: bg,
      border: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      fontSize: "14px", fontWeight: 600, color: "#bdbdbd",
      fontFamily: FONT, letterSpacing: "0.02em",
    }}>
      {initials}
    </div>
  );
}

function ChevronRight({ hovered }: { hovered: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke={hovered ? "#bdbdbd" : "#3a3a3a"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "stroke 0.16s", flexShrink: 0 }}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CreateOrgButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href="/org/new"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "9px",
        padding: "13px 14px",
        background: "transparent",
        border: `1px dashed ${hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: "9px",
        color: hovered ? "#d8d8d8" : "#9a9a9a",
        fontSize: "13px", fontWeight: 500, fontFamily: FONT,
        cursor: "pointer", transition: "all 0.16s", letterSpacing: "0.02em",
        textDecoration: "none",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Criar nova organização
    </Link>
  );
}
