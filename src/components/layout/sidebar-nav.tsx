"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  ShieldCheck,
  CreditCard,
  Database,
  LogOut,
  Search,
} from "lucide-react";
import { OrgSwitcher, type OrgLink } from "./org-switcher";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { GlobalSearchDialog } from "@/features/search/components/global-search-dialog";

// ─── Design helpers ───────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "U";
  return local.slice(0, 2).toUpperCase();
}

function colorIndex(s: string): number {
  return [...s].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 6;
}

const AVATAR_BG = [
  "#2a2a2a",
  "#23241f",
  "#1f2630",
  "#26221f",
  "#1f2422",
  "#2c2622",
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="0" y="0" width="10" height="10" fill="#f0f0f0" rx="1.5" />
        <rect
          x="12"
          y="0"
          width="10"
          height="10"
          fill="rgba(255,255,255,0.2)"
          rx="1.5"
        />
        <rect
          x="0"
          y="12"
          width="10"
          height="10"
          fill="rgba(255,255,255,0.2)"
          rx="1.5"
        />
        <rect
          x="12"
          y="12"
          width="10"
          height="10"
          fill="rgba(255,255,255,0.06)"
          rx="1.5"
        />
      </svg>
      <span
        style={{
          fontFamily: "'Bebas Neue',sans-serif",
          fontSize: 19,
          letterSpacing: "0.08em",
          color: "#e8e8e8",
        }}
      >
        PROJORG
      </span>
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  active: boolean;
}

function NavItem({ href, label, icon: Icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "9px 12px",
        background: active ? "rgba(255,255,255,0.05)" : "transparent",
        border: `1px solid ${active ? "rgba(255,255,255,0.07)" : "transparent"}`,
        borderRadius: 7,
        color: active ? "#efefef" : "#7a7a7a",
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        fontFamily: "'Space Grotesk',sans-serif",
        textDecoration: "none",
        transition: "all 0.15s",
        letterSpacing: "0.005em",
      }}
    >
      <Icon
        style={{
          width: 16,
          height: 16,
          color: active ? "#efefef" : "#5a5a5a",
          flexShrink: 0,
        }}
      />
      {label}
    </Link>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SidebarNavProps {
  orgSlug: string;
  orgName: string;
  userOrgs: OrgLink[];
  userEmail: string;
  userName?: string | null;
  canAudit?: boolean;
  canBilling?: boolean;
  canDataExport?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SidebarNav({
  orgSlug,
  orgName,
  userOrgs,
  userEmail,
  userName,
  canAudit,
  canBilling,
  canDataExport,
}: SidebarNavProps) {
  const pathname = usePathname();
  const base = `/org/${orgSlug}`;

  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navItems = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/projects`, label: "Projetos", icon: FolderKanban },
    { href: `${base}/team`, label: "Equipe", icon: Users },
    ...(canAudit
      ? [{ href: `${base}/audit`, label: "Auditoria", icon: ShieldCheck }]
      : []),
    { href: `${base}/settings`, label: "Configurações", icon: Settings },
    ...(canBilling
      ? [
          {
            href: `${base}/settings/billing`,
            label: "Plano & Uso",
            icon: CreditCard,
          },
        ]
      : []),
    ...(canDataExport
      ? [{ href: `${base}/settings/data`, label: "Export", icon: Database }]
      : []),
  ];

  const initials = getInitials(userName, userEmail);
  const avatarBg = AVATAR_BG[colorIndex(userEmail) % AVATAR_BG.length]!;

  return (
    <>
      <GlobalSearchDialog
        orgSlug={orgSlug}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />

      <aside
        style={{
          width: 240,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#0d0d0d",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* ── Logo ────────────────────────────────────────────────── */}
        <div style={{ padding: "24px 20px 18px" }}>
          <Logo />
        </div>

        {/* ── Org switcher ────────────────────────────────────────── */}
        <div style={{ padding: "0 14px 18px" }}>
          <OrgSwitcher
            currentSlug={orgSlug}
            currentName={orgName}
            orgs={userOrgs}
          />
        </div>

        {/* ── Nav ─────────────────────────────────────────────────── */}
        <nav
          style={{
            padding: "0 14px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
          aria-label="Navegação principal"
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#3a3a3a",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 12px 6px",
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            Workspace
          </div>
          {navItems.map(({ href, label, icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={active}
              />
            );
          })}
        </nav>

        {/* ── Spacer ──────────────────────────────────────────────── */}
        <div style={{ flex: 1 }} />

        {/* ── Search ──────────────────────────────────────────────── */}
        <div style={{ padding: "0 14px 4px" }}>
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "9px 12px",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 7,
              color: "#5a5a5a",
              fontSize: 13,
              fontFamily: "'Space Grotesk',sans-serif",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#9a9a9a";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#5a5a5a";
              e.currentTarget.style.background = "transparent";
            }}
            aria-label="Abrir busca (⌘K)"
          >
            <Search style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Buscar</span>
            <kbd
              style={{
                fontSize: 10,
                color: "#3a3a3a",
                padding: "1px 5px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ── User footer ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "8px 14px 18px",
            borderTop: "1px solid rgba(255,255,255,0.045)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px",
              borderRadius: 7,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: avatarBg,
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 600,
                color: "#a0a0a0",
                fontFamily: "'Space Grotesk',sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              {initials}
            </div>

            {/* Name + email */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "#d8d8d8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                {userName ?? userEmail.split("@")[0]}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "#5a5a5a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                {userEmail}
              </div>
            </div>

            {/* Notifications */}
            <div style={{ color: "#4a4a4a", display: "flex" }}>
              <NotificationBell />
            </div>

            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#4a4a4a",
                padding: "6px",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#9a9a9a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#4a4a4a";
              }}
              title="Sair"
              aria-label="Sair da conta"
            >
              <LogOut style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
