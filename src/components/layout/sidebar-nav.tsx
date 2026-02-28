"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

interface SidebarNavProps {
  orgSlug: string;
  orgName: string;
}

export function SidebarNav({ orgSlug, orgName }: SidebarNavProps) {
  const pathname = usePathname();
  const base = `/org/${orgSlug}`;

  const navItems: NavItem[] = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/settings`, label: "Configurações", icon: Settings },
  ];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar">
      {/* Org name */}
      <div className="flex h-14 items-center border-b px-4">
        <span
          className="truncate font-semibold tracking-tight text-sidebar-foreground"
          title={orgName}
        >
          {orgName}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2" aria-label="Navegação principal">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden={true} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
