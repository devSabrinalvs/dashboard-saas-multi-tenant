"use client";

import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projetos",
  team: "Equipe",
  audit: "Auditoria",
  settings: "Configurações",
};

const PAGE_SEGMENTS = Object.keys(PAGE_LABELS);

interface TopbarProps {
  userEmail: string;
  userName?: string | null;
  orgName: string;
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (!email) return "U";
  const local = email.split("@")[0] ?? "U";
  return local.slice(0, 2).toUpperCase();
}

export function Topbar({ userEmail, userName, orgName }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const segment =
    pathname.split("/").find((s) => PAGE_SEGMENTS.includes(s)) ?? "";
  const pageLabel = PAGE_LABELS[segment] ?? "";

  // Extrai /org/[orgSlug] da URL atual para montar link de configurações
  const orgSlug = pathname.match(/\/org\/([^/]+)/)?.[1] ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 gap-4">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="truncate max-w-[140px] text-muted-foreground">
          {orgName}
        </span>
        {pageLabel && (
          <>
            <span className="text-muted-foreground/40 select-none">/</span>
            <span className="font-medium text-foreground">{pageLabel}</span>
          </>
        )}
      </div>

      {/* Right — theme toggle + notifications + profile */}
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Menu do usuário"
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(userName, userEmail)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              {userName && (
                <p className="truncate text-sm font-medium">{userName}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer flex items-center gap-2"
              onClick={() => router.push(`/org/${orgSlug}/settings`)}
            >
              <Settings className="size-3.5" aria-hidden />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
