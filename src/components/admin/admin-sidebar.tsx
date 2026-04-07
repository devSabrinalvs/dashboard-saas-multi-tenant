"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/orgs", label: "Organizações", icon: Building2 },
  { href: "/admin/audit", label: "Audit Log", icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Shield className="size-4 text-destructive" aria-hidden />
        <span className="font-semibold text-sm">Admin Console</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2" aria-label="Navegação admin">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-3">
        <p className="text-xs text-muted-foreground/40">Acesso restrito</p>
      </div>
    </aside>
  );
}
