"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Database,
  FolderKanban,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgSwitcher, type OrgLink } from "./org-switcher";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

interface SidebarNavProps {
  orgSlug: string;
  orgName: string;
  userOrgs: OrgLink[];
  canAudit?: boolean;
  canBilling?: boolean;
  canDataExport?: boolean;
}

export function SidebarNav({
  orgSlug,
  orgName,
  userOrgs,
  canAudit,
  canBilling,
  canDataExport,
}: SidebarNavProps) {
  const pathname = usePathname();
  const base = `/org/${orgSlug}`;

  const navItems: NavItem[] = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/team`, label: "Equipe", icon: Users },
    { href: `${base}/projects`, label: "Projetos", icon: FolderKanban },
    ...(canAudit
      ? [{ href: `${base}/audit`, label: "Auditoria", icon: ShieldCheck }]
      : []),
    { href: `${base}/settings`, label: "Configurações", icon: Settings },
    ...(canBilling
      ? [{ href: `${base}/settings/billing`, label: "Plano & Uso", icon: CreditCard }]
      : []),
    ...(canDataExport
      ? [{ href: `${base}/settings/data`, label: "Export / Import", icon: Database }]
      : []),
  ];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar">
      {/* Org switcher */}
      <div className="flex h-14 items-center border-b px-3">
        <OrgSwitcher
          currentSlug={orgSlug}
          currentName={orgName}
          orgs={userOrgs}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2" aria-label="Navegação principal">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                  : "font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden={true} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-3">
        <p className="text-xs text-muted-foreground/40">SaaS Dashboard</p>
      </div>
    </aside>
  );
}
