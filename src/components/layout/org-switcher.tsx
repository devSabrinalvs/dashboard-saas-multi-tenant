"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface OrgLink {
  id: string;
  name: string;
  slug: string;
}

interface OrgSwitcherProps {
  currentSlug: string;
  currentName: string;
  orgs: OrgLink[];
}

// Squircle icon with deterministic colour from org name
const ORG_BG = [
  "#22241f",
  "#1f2630",
  "#23202c",
  "#262220",
  "#1f2422",
  "#2c2222",
];

function getOrgBg(name: string): string {
  const idx =
    [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % ORG_BG.length;
  return ORG_BG[idx]!;
}

function getOrgInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function OrgIcon({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        background: getOrgBg(name),
        border: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: Math.round(size * 0.36),
        fontWeight: 600,
        color: "#bdbdbd",
        fontFamily: "'Space Grotesk',sans-serif",
        letterSpacing: "0.01em",
      }}
    >
      {getOrgInitials(name)}
    </div>
  );
}

export function OrgSwitcher({
  currentSlug,
  currentName,
  orgs,
}: OrgSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.022)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8,
            cursor: "pointer",
            textAlign: "left",
          }}
          aria-label="Trocar de organização"
        >
          <OrgIcon name={currentName} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#e8e8e8",
                letterSpacing: "-0.005em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              {currentName}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "#5a5a5a",
                letterSpacing: "0.04em",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              workspace
            </div>
          </div>
          <ChevronsUpDown
            style={{ width: 14, height: 14, color: "#4a4a4a", flexShrink: 0 }}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {orgs.map((org) => (
          <DropdownMenuItem key={org.id} asChild>
            <Link
              href={`/org/${org.slug}/dashboard`}
              className="flex cursor-pointer items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{org.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {org.slug}
                </p>
              </div>
              {org.slug === currentSlug && (
                <Check className="size-3.5 shrink-0 text-primary" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/org/new"
            className="flex cursor-pointer items-center gap-2 text-muted-foreground"
          >
            <Plus className="size-3.5" />
            <span>Criar nova organização</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
